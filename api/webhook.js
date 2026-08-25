// api/webhook.js
// Recebe a notificacao do BassPago quando um Pix e pago.
// Payload: { "pix": [ { endToEndId, txid, valor, horario } ] }

const bp = require('./_basspago')
const { enviarEmailConfirmacao } = require('./_email')

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Metodo nao permitido.' })
    return
  }

  try {
    const payload = await bp.lerBody(req)
    const lista = payload && Array.isArray(payload.pix) ? payload.pix : []

    if (lista.length === 0) {
      // Responde 200 para o BassPago nao ficar reenviando
      res.status(200).json({ success: false, message: 'Nenhum pix no payload.' })
      return
    }

    for (let i = 0; i < lista.length; i++) {
      const pix = lista[i] || {}
      const txid = String(pix.txid || '').replace(/[^a-zA-Z0-9]/g, '')
      if (!txid) continue

      // Dono do pedido, checagem 1: prefixo do txid.
      // A conta BassPago e compartilhada com outros projetos (Norisk,
      // ajude-main) e o webhook e por conta, nao por produto - um txid sem
      // o prefixo deste projeto e de outro produto e nao deve ser
      // processado aqui.
      const prefixo = String(bp.CONFIG.txidPrefix || 'ELV')
      if (txid.slice(0, prefixo.length).toLowerCase() !== prefixo.toLowerCase()) {
        console.log('[webhook] txid=' + txid + ' nao pertence a este projeto (prefixo != ' + prefixo + '), ignorando')
        continue
      }

      const txData = await bp.loadTx(txid)

      // Dono do pedido, checagem 2: o pedido precisa existir no registro
      // local. Mesmo com o prefixo certo, sem isso um txid nunca gerado
      // por este projeto seria processado e reportado pra UTMify mesmo
      // assim. loadTx() retorna {} (objeto vazio) quando nao encontra -
      // por isso a checagem e por chaves, nao so por truthy.
      if (!txData || Object.keys(txData).length === 0) {
        console.log('[webhook] txid=' + txid + ' tem prefixo certo mas nao existe no registro local, ignorando')
        continue
      }

      // Idempotencia: nao processa o mesmo pagamento duas vezes
      if (txData && txData.status === 'paid') continue

      const atualizado = Object.assign({}, txData, {
        txid: txid,
        valor: pix.valor || (txData && txData.valor) || '0.00',
        status: 'paid',
        paidAt: pix.horario
          ? new Date(pix.horario).toISOString().slice(0, 19).replace('T', ' ')
          : new Date().toISOString().slice(0, 19).replace('T', ' '),
        endToEndId: pix.endToEndId || null,
      })

      await bp.saveTx(txid, atualizado)
      await bp.sendUtmify('paid', atualizado)
      await bp.sendFacebookPurchase(atualizado, req)
      await enviarEmailConfirmacao(atualizado)
    }

    res.status(200).json({ success: true })
  } catch (e) {
    // Sempre 200: evita retentativas infinitas do gateway
    res.status(200).json({ success: false, error: e.message })
  }
}

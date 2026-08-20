// api/_email.js
// Envia o e-mail de confirmacao de pagamento via Gmail SMTP (nodemailer).
// Variaveis de ambiente usadas (ja configuradas na Vercel):
//   GMAIL_USER            e-mail do Gmail usado para enviar
//   GMAIL_APP_PASSWORD    senha de app do Gmail (nao e a senha normal da conta)
//   EMAIL_REMETENTE_NOME  nome exibido como remetente (opcional)
//
// IMPORTANTE: o envio nunca deve derrubar a confirmacao do pagamento.
// Qualquer erro aqui e apenas logado, nunca lancado para quem chamou.

function montarHtml(data) {
  const nome = data.nome || 'Cliente'
  const produto = data.descricao || 'seu pedido'
  const valor = parseFloat(data.valor || 0).toFixed(2).replace('.', ',')
  const pedido = data.txid || ''

  return `<!DOCTYPE html>
<html lang="pt-br">
<head><meta charset="UTF-8"><title>Pagamento confirmado</title></head>
<body style="background:#f4f4f4; padding: 30px 0;">
  <div style="max-width: 560px; margin: 0 auto; background:#fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1);">
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #222;">
      <div style="text-align: center; padding-bottom: 16px; margin-bottom: 16px; border-bottom: 1px solid #eee;">
        <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; letter-spacing: 4px; color: #111;">L'ORÉAL PARIS</span>
      </div>
      <h2 style="color: #16a34a; margin-bottom: 4px;">Pagamento confirmado ✅</h2>
      <p>Olá, ${nome}!</p>
      <p>Recebemos a confirmação do pagamento do seu pedido <strong>${produto}</strong>.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">Produto</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${produto}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">Valor pago</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">R$ ${valor}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;">Pedido</td>
          <td style="padding: 8px 0; text-align: right;">${pedido}</td>
        </tr>
      </table>
      <p>Em breve seu pedido será preparado e enviado. O código de rastreio será enviado em até 48 horas.</p>
      <p>Qualquer dúvida, responda este e-mail.</p>
      <p style="margin-top: 24px; font-size: 12px; color: #888;">© 2026 L'Oréal Paris</p>
    </div>
  </div>
</body>
</html>`
}

async function enviarEmailConfirmacao(data) {
  try {
    if (!data || !data.email) return

    const user = process.env.GMAIL_USER
    const pass = process.env.GMAIL_APP_PASSWORD
    const nomeRemetente = process.env.EMAIL_REMETENTE_NOME || "L'Oréal Paris"

    if (!user || !pass) {
      // Sem Gmail configurado: nao envia, mas nao quebra o fluxo de pagamento
      console.log('[_email] GMAIL_USER/GMAIL_APP_PASSWORD nao configurados, pulando envio para', data.email)
      return
    }

    // require dinamico: se "nodemailer" nao estiver instalado, cai no catch
    // abaixo em vez de derrubar o modulo inteiro (e junto o check_payment/webhook)
    const nodemailer = require('nodemailer')

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: user, pass: pass },
    })

    await transporter.sendMail({
      from: `"${nomeRemetente}" <${user}>`,
      to: data.email,
      subject: 'Pagamento confirmado - seu pedido está a caminho!',
      html: montarHtml(data),
    })
  } catch (e) {
    // Nunca deixar o envio de e-mail quebrar a confirmacao do pagamento
    console.error('[_email] Falha ao enviar e-mail de confirmacao:', e.message)
  }
}

module.exports = { enviarEmailConfirmacao: enviarEmailConfirmacao }

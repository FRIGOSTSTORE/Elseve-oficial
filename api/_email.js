// api/_email.js
// Envia o e-mail de confirmacao de compra usando o Gmail (SMTP com senha de app).
//
// Variaveis de ambiente necessarias na Vercel:
//   GMAIL_USER            -> o e-mail do Gmail que vai enviar (ex: contato@gmail.com)
//   GMAIL_APP_PASSWORD    -> a senha de app de 16 caracteres (NAO e a senha normal)
//   EMAIL_REMETENTE_NOME  -> opcional, nome exibido no "de" (ex: "L'Oreal Paris")
//
// Como gerar a senha de app do Gmail:
//   1. Ative a verificacao em 2 etapas na conta Google.
//   2. Acesse https://myaccount.google.com/apppasswords
//   3. Crie uma senha de app (qualquer nome, ex: "checkout") e copie os 16 caracteres.

const nodemailer = require('nodemailer')

let transporterCache = null

function getTransporter() {
  if (transporterCache) return transporterCache

  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) return null

  transporterCache = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: user, pass: pass },
  })

  return transporterCache
}

function formatarValor(valor) {
  const n = parseFloat(valor || 0) || 0
  return 'R$ ' + n.toFixed(2).replace('.', ',')
}

function montarHtml(data) {
  const nome = data.nome || 'Cliente'
  const produto = data.descricao || 'seu pedido'
  const valor = formatarValor(data.valor)

  return `
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
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${valor}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;">Pedido</td>
        <td style="padding: 8px 0; text-align: right;">${data.txid || ''}</td>
      </tr>
    </table>
    <p>Em breve seu pedido será preparado e enviado. Qualquer dúvida, responda este e-mail.</p>
    <p style="margin-top: 24px; font-size: 12px; color: #888;">© 2026 L'Oréal Paris</p>
  </div>
  `
}

async function enviarEmailConfirmacao(data) {
  try {
    if (!data || !data.email) return

    const transporter = getTransporter()
    if (!transporter) return // sem credenciais configuradas: nao quebra o fluxo

    const remetenteNome = process.env.EMAIL_REMETENTE_NOME || "L'Oréal Paris"

    await transporter.sendMail({
      from: `"${remetenteNome}" <${process.env.GMAIL_USER}>`,
      to: data.email,
      subject: 'Pagamento confirmado - seu pedido está a caminho!',
      html: montarHtml(data),
    })
  } catch (e) {
    // e-mail nunca deve derrubar a confirmacao de pagamento
    console.error('Falha ao enviar e-mail de confirmacao:', e.message)
  }
}

module.exports = {
  enviarEmailConfirmacao: enviarEmailConfirmacao,
}

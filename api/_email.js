// api/_email.js
// Envia o e-mail de confirmacao de pagamento via SMTP (nodemailer).
// Variaveis de ambiente necessarias na Vercel:
//   SMTP_HOST      ex: smtp.gmail.com
//   SMTP_PORT      ex: 465 (SSL) ou 587 (STARTTLS)
//   SMTP_USER      seu usuario/e-mail de envio
//   SMTP_PASS      senha ou senha de app (Gmail exige "senha de app", nao a senha normal)
//   SMTP_FROM      opcional, remetente exibido (default: SMTP_USER)
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

    const host = process.env.SMTP_HOST
    const port = parseInt(process.env.SMTP_PORT || '465', 10)
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS
    const from = process.env.SMTP_FROM || user

    if (!host || !user || !pass) {
      // Sem SMTP configurado: nao envia, mas nao quebra o fluxo de pagamento
      console.log('[_email] SMTP nao configurado, pulando envio para', data.email)
      return
    }

    // require dinamico: se "nodemailer" nao estiver instalado, cai no catch
    // abaixo em vez de derrubar o modulo inteiro (e junto o check_payment/webhook)
    const nodemailer = require('nodemailer')

    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: port === 465, // true para 465 (SSL), false para 587 (STARTTLS)
      auth: { user: user, pass: pass },
    })

    await transporter.sendMail({
      from: from,
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

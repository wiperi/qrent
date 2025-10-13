import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY!); // 用你自己的 API Key 替换

const msg = {
  to: 'test@gmail.com', // 收件人
  from: 'support@qrent.rent', // 必须是你刚才验证的 Sender
  subject: 'Test Email',
  text: 'This is a test email',
  html: '<strong>This is a test email</strong>',
};

sgMail
  .send(msg)
  .then(() => {
    console.log('邮件发送成功');
  })
  .catch(error => {
    console.error('发送失败:', error);
  });

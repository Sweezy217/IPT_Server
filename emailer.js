const nodemailer = require('nodemailer');
require('dotenv').config();

const sendInvitationEmail = async (email, workspaceName, inviteLink) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'your-email-service', // e.g., 'gmail'
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Invitation to join ${workspaceName}`,
      html: `
        <h3>Hello,</h3>
        <p>You have been invited to join the workspace <strong>${workspaceName}</strong>.</p>
        <p>Click the link below to join:</p>
        <a href="${inviteLink}">Join Workspace</a>
        <p>If you did not expect this invitation, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Invitation email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = sendInvitationEmail;

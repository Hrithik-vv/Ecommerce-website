const nodemailer = require("nodemailer");

async function sendotp(otp, email) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'vvhrithik2@gmail.com',
            pass: 'tftp ykoq zerq tqrf'
        }
    })
    const mail = {
        from: 'your-email@gmail.com',
        to: email,
        subject: 'Your OTP Code',
        html: `
        <html>
          <head>
            <style>
              body {
                font-family: 'Arial', sans-serif;
                background-color: #f4f7fc;
                color: #333;
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 600px;
                margin: 30px auto;
                padding: 20px;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              .header h1 {
                color: #4CAF50;
                font-size: 24px;
              }
              .otp-code {
                font-size: 36px;
                font-weight: bold;
                color: #4CAF50;
                text-align: center;
                margin-top: 20px;
              }
              .message {
                font-size: 16px;
                text-align: center;
                margin-top: 10px;
                color: #555;
              }
              .footer {
                font-size: 14px;
                text-align: center;
                margin-top: 30px;
                color: #777;
              }
              .button {
                display: inline-block;
                padding: 10px 20px;
                font-size: 16px;
                color: #fff;
                background-color: #4CAF50;
                text-decoration: none;
                border-radius: 4px;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Our Service!</h1>
              </div>
              <div class="message">
                <p>Your OTP verification code is:</p>
                <div class="otp-code">${otp}</div>
              </div>
              <div class="footer">
                <p>This OTP is valid for 5 minutes. If you did not request this, please ignore this message.</p>
              </div>
              
            </div>
          </body>
        </html>
      `
    }
   
    try {
      
      
        const info = await transporter.sendMail(mail);
        console.log('Email sent: ' + info.response);
        return true
    } catch (error) {
        console.error('Error sending email: ', error);
        return false
    }
}


const generateOtp = () => {
    
    const otp = crypto.randomInt(100000, 1000000);
    return otp.toString(); 
};

module.exports = sendotp

# Oxyboo E-commerce Platform

## Features

- Product browsing and search
- User authentication and authorization
- Shopping cart functionality
- Order management
- Payment processing
- Admin dashboard
- Referral system with wallet credits
- Auto port management (automatically handles port conflicts)

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Create a `.env` file with the following variables (customize as needed):
```
PORT=3001
BASE_URL=http://localhost:3001
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
NODEMAILER_PASSWORD=your_email_password
NODEMAILER_EMAIL=your_email@gmail.com
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

## Starting the Application

The application now includes intelligent port management that automatically handles cases where the port is already in use.

### Development Mode

```bash
npm run dev
```

This starts the application with nodemon for automatic restarts on file changes.

### Production Mode

```bash
npm start
```

This starts the application in production mode.

### Debug Mode

```bash
npm run debug
```

This starts the application with Node's inspector for debugging.

## Automatic Port Management

The application now automatically:

1. Checks if the specified port is already in use
2. Identifies the process using the port
3. Attempts to kill the conflicting process
4. Starts the server on the cleared port

This eliminates the need to manually find and kill processes when you encounter the "port already in use" error.

## Referral System

The platform includes a referral system where:

1. Users can share their unique referral code with friends
2. When a new user signs up using a referral code, the referrer receives ₹50 in their wallet
3. Users can track their referrals and earnings in their profile

## Wallet System

Users have a digital wallet that:

1. Stores credits earned from referrals
2. Can be used for making purchases
3. Allows viewing transaction history

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request 
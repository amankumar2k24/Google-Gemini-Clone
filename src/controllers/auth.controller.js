import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { generateOTP, isOTPValid } from '../utils/otp.js';

export const signup = async (req, res, next) => {
  try {
    const { mobileNumber, name, password } = req.body;

    // Validate mobile number format
    if (!mobileNumber || !/^[0-9]{10}$/.test(mobileNumber)) {
      return res.status(400).json({ 
        error: 'Invalid mobile number format. Must be 10 digits.' 
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { mobileNumber }
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'Mobile number already registered' 
      });
    }

    // Hash password if provided
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    // Create user
    const user = await prisma.user.create({
      data: {
        mobileNumber,
        name: name || null,
        password: hashedPassword
      },
      select: {
        id: true,
        mobileNumber: true,
        name: true,
        subscriptionTier: true,
        createdAt: true
      }
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        mobileNumber: user.mobileNumber,
        name: user.name,
        subscriptionTier: user.subscriptionTier
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    next(error);
  }
};

export const sendOTP = async (req, res, next) => {
  try {
    const { mobileNumber } = req.body;

    const user = await prisma.user.findUnique({
      where: { mobileNumber }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.oTP.create({
      data: {
        userId: user.id,
        code: otp,
        expiresAt
      }
    });

    // In production, send via SMS. For now, return in response
    res.json({
      message: 'OTP sent successfully',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined,
      expiresIn: '10 minutes'
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOTP = async (req, res, next) => {
  try {
    const { mobileNumber, otp } = req.body;

    const user = await prisma.user.findUnique({
      where: { mobileNumber }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validOTP = await prisma.oTP.findFirst({
      where: {
        userId: user.id,
        code: otp,
        verified: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!validOTP) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    await prisma.oTP.update({
      where: { id: validOTP.id },
      data: { verified: true }
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'OTP verified successfully',
      token,
      user: {
        id: user.id,
        mobileNumber: user.mobileNumber,
        name: user.name,
        subscriptionTier: user.subscriptionTier
      }
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { mobileNumber } = req.body;

    const user = await prisma.user.findUnique({
      where: { mobileNumber }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.oTP.create({
      data: {
        userId: user.id,
        code: otp,
        expiresAt
      }
    });

    res.json({
      message: 'Password reset OTP sent',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (user.password) {
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

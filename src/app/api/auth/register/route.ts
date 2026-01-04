import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { sanitizeInput, isValidEmail, validatePassword } from '@/lib/sanitize';

export async function POST(request: NextRequest) {
    try {
        // Rate limiting - prevent registration abuse
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimit = checkRateLimit(`register:${ip}`, RATE_LIMITS.register);

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'تم تجاوز عدد التسجيلات المسموحة. حاول مرة أخرى لاحقاً.' },
                { status: 429 }
            );
        }

        // Check if MONGODB_URI is set
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI is not defined');
            return NextResponse.json(
                { error: 'خطأ في إعدادات الخادم' },
                { status: 500 }
            );
        }

        await connectDB();

        const body = await request.json();
        const name = sanitizeInput(body.name || '');
        const email = sanitizeInput(body.email || '').toLowerCase();
        const password = body.password || '';

        // Validate input
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: 'الرجاء ملء جميع الحقول' },
                { status: 400 }
            );
        }

        // Validate email format
        if (!isValidEmail(email)) {
            return NextResponse.json(
                { error: 'البريد الإلكتروني غير صالح' },
                { status: 400 }
            );
        }

        // Validate password
        const passwordCheck = validatePassword(password);
        if (!passwordCheck.valid) {
            return NextResponse.json(
                { error: passwordCheck.message },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
                { status: 400 }
            );
        }

        // Check if user exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json(
                { error: 'البريد الإلكتروني مسجل مسبقاً' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user with pending status (requires admin approval)
        await User.create({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: 'user',
            status: 'pending', // User needs admin approval
            isBanned: false,
        });

        // Return success - user needs to wait for approval
        return NextResponse.json(
            {
                message: 'تم إرسال طلب التسجيل بنجاح. يرجى انتظار موافقة المشرف.',
                pending: true,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Registration error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: 'حدث خطأ: ' + errorMessage },
            { status: 500 }
        );
    }
}



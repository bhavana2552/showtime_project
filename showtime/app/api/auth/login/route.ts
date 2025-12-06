import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import db from "@/lib/db";

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = LoginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  try {
    type UserRow = RowDataPacket & {
      user_id: number;
      user_name: string | null;
      email: string;
      phone: string | null;
      password_hash: string;
    };

    const [rows] = await db.execute<UserRow[]>(
      "SELECT user_id, user_name, email, phone, password_hash FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    const user = rows?.[0];

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash,
    );

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    return NextResponse.json({
      user: {
        id: user.user_id,
        name: user.user_name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}






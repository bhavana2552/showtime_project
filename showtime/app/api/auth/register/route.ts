import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import db from "@/lib/db";
import type { ResultSetHeader } from "mysql2";

const RegisterSchema = z.object({
  user_name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .optional()
    .refine(
      (value) => !value || /^\d{10}$/.test(value),
      "Phone number must be exactly 10 digits",
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d).+$/,
      "Password must include at least one letter and one number",
    ),
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

  const parsed = RegisterSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { user_name, email, phone, password } = parsed.data;

  try {
    const [existing] = await db.query(
      "SELECT user_id FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await db.execute<ResultSetHeader>(
      "INSERT INTO users (user_name, email, phone, password_hash) VALUES (?, ?, ?, ?)",
      [user_name, email, phone ?? null, passwordHash],
    );

    return NextResponse.json(
      {
        user: {
          id: result.insertId,
          name: user_name,
          email,
          phone: phone ?? null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

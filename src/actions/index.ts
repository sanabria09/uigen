// "use server" marks every exported function in this file as a Server Action.
// Server Actions are async functions that run on the server but can be called
// directly from client components — Next.js handles the network call automatically.
// They replace the need for separate POST API routes for form submissions.
"use server";

import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession, getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface AuthResult {
  success: boolean;
  error?: string;
}

export async function signUp(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    if (!email || !password) {
      return { success: false, error: "Email and password are required" };
    }

    if (password.length < 8) {
      return {
        success: false,
        error: "Password must be at least 8 characters",
      };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: "Email already registered" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    // Write the JWT into an httpOnly cookie so the browser stores the session.
    await createSession(user.id, user.email);

    // `revalidatePath` tells Next.js to bust the cached version of "/" so the
    // next render reflects the newly authenticated user.
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Sign up error:", error);
    return { success: false, error: "An error occurred during sign up" };
  }
}

export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    if (!email || !password) {
      return { success: false, error: "Email and password are required" };
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { success: false, error: "Invalid credentials" };
    }

    // bcrypt.compare checks the plain-text password against the stored hash
    // without ever decoding the hash (one-way comparison).
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return { success: false, error: "Invalid credentials" };
    }

    await createSession(user.id, user.email);

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Sign in error:", error);
    return { success: false, error: "An error occurred during sign in" };
  }
}

export async function signOut() {
  await deleteSession();
  revalidatePath("/");
  redirect("/");
}

// Called from server components to get the currently logged-in user.
// Returns null for anonymous visitors.
export async function getUser() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  try {
    // `select` limits the returned fields — we never expose the password hash.
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    return user;
  } catch (error) {
    console.error("Get user error:", error);
    return null;
  }
}

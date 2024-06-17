import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { signinInput, signupInput } from "@rajat777/medium-common";

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
}>();

userRouter.post("/signup", async (c) => {
  const body = await c.req.json();

  const { success } = signupInput.safeParse(body);

  if (!success) {
    c.status(411);

    return c.json({
      message: "Input not correct",
    });
  }

  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  // hashed the password
  // catch duplicate email or incorrect user data
  try {
    const user = await prisma.user.create({
      data: {
        username: body.username,
        password: body.password,
        name: body.name,
      },
    });

    const jwt = await sign(
      {
        id: user.id,
      },
      c.env.JWT_SECRET
    );

    return c.text(jwt);
  } catch (e) {
    console.log(e);
    c.status(411);
    c.text("User already exists with this email");
  }
});

userRouter.post("/signin", async (c) => {
  const body = await c.req.json();

  const { success } = signinInput.safeParse(body);

  if (!success) {
    c.status(403);
    return c.json({
      message: "Unauthorized Request!",
    });
  }

  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  // zod and hashed the password
  // catch duplicate email or incorrect user data
  try {
    const user = await prisma.user.findFirst({
      where: {
        username: body.username,
        password: body.password,
      },
    });

    if (!user) {
      c.status(403); // Unauthorized Request
      return c.text("Unauthorized Request!");
    }

    const jwt = await sign(
      {
        id: user.id,
      },
      c.env.JWT_SECRET
    );

    return c.text(jwt);
  } catch (e) {
    console.log(e);
    c.status(411);
    c.text("User already exists with this email");
  }
});

import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { createBlogInput, updateBlogInput } from "@rajat777/medium-common";
import { Hono } from "hono";
import { verify } from "hono/jwt";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string | unknown;
  };
}>();

blogRouter.use("/*", async (c, next) => {
  // extract the authorId
  // pass it down to the route handler
  const authHeader = c.req.header("authorization") || "";

  const user = await verify(authHeader, c.env.JWT_SECRET);

  if (user) {
    c.set("userId", user.id);

    await next();
  } else {
    c.status(403);

    return c.json({
      message: "You are not logged in",
    });
  }
});

blogRouter.post("/", async (c) => {
  const body = await c.req.json();

  const { success } = createBlogInput.safeParse(body);

  if (!success) {
    c.status(501);

    return c.json({
      message: "Blog is not created!",
    });
  }

  const userId = c.get("userId");

  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blog = await prisma.blog.create({
    data: {
      title: body.title,
      content: body.content,
      authorId: Number(userId),
    },
  });

  return c.json({
    id: blog.id,
  });
});

blogRouter.put("/:id", async (c) => {
  const body = await c.req.json();
  const blogId = await c.req.param("id");

  const { success } = updateBlogInput.safeParse(body);

  if (!success) {
    c.status(403);

    return c.json({
      message: "Input is incorrect!",
    });
  }

  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blog = await prisma.blog.update({
    where: {
      id: Number(blogId),
    },
    data: {
      title: body.title,
      content: body.content,
    },
  });

  return c.json(blog);
});

// pagination
blogRouter.get("/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blogs = await prisma.blog.findMany();

  return c.json(blogs);
});

blogRouter.get("/:id", async (c) => {
  const blogId = await c.req.param("id");

  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blog = await prisma.blog.findFirst({
    where: {
      id: Number(blogId),
    },
  });

  return c.json(blog);
});

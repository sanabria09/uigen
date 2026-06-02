// page.tsx at the root of /app maps to the "/" route.
// The `async` keyword is valid here because Next.js page components run on the server
// by default — they can await database calls, auth checks, etc. before sending HTML.
import { getUser } from "@/actions";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";
import { MainContent } from "./main-content";
import { redirect } from "next/navigation";

export default async function Home() {
  // Running on the server, so we can call DB/auth helpers directly (no fetch needed).
  const user = await getUser();

  // `redirect()` from next/navigation stops rendering and sends a 307 to the browser.
  // Authenticated users always land on a project page, never the home page.
  if (user) {
    const projects = await getProjects();

    if (projects.length > 0) {
      redirect(`/${projects[0].id}`);
    }

    // If no projects exist, create a new one
    const newProject = await createProject({
      name: `New Design #${~~(Math.random() * 100000)}`,
      messages: [],
      data: {},
    });

    redirect(`/${newProject.id}`);
  }

  // Anonymous users fall through here and get the UI without a saved project.
  return <MainContent user={user} />;
}

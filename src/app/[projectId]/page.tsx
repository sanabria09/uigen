// The [projectId] folder name creates a dynamic segment — Next.js matches any URL
// like /abc123 and passes "abc123" as params.projectId to this component.
import { getUser } from "@/actions";
import { getProject } from "@/actions/get-project";
import { MainContent } from "@/app/main-content";
import { redirect } from "next/navigation";

// In Next.js 15, dynamic params arrive as a Promise and must be awaited.
interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const { projectId } = await params;
  const user = await getUser();

  // Unauthenticated visitors can't view project pages; send them to the home page.
  if (!user) {
    redirect("/");
  }

  let project;
  try {
    project = await getProject(projectId);
  } catch (error) {
    // If project not found or user doesn't have access, redirect to home
    redirect("/");
  }

  return <MainContent user={user} project={project} />;
}

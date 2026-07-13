'use client';

export function ContinueButton({ projectId, title, overview }: { projectId: string; title: string; overview: string | null }) {
  return (
    <button
      type="button"
      onClick={() => {
        localStorage.setItem('prd_project_id', projectId);
        localStorage.setItem('prd_title', title);
        localStorage.setItem('prd_idea', overview ?? '');
        window.location.href = `/generate?projectId=${encodeURIComponent(projectId)}&resume=1`;
      }}
      className="rounded-input bg-accent px-4 py-1.5 text-xs font-medium text-accent-text transition-colors hover:bg-accent-hover"
    >
      Lanjutkan
    </button>
  );
}

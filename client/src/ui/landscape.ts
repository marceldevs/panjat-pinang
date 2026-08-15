export function setupLandscapeLock(): void {
  const overlay = document.getElementById("rotate-overlay");
  if (!overlay) return;

  const update = () => {
    const portrait = window.innerHeight > window.innerWidth;
    overlay.classList.toggle("show", portrait);
  };

  update();
  window.addEventListener("resize", update);
  window.addEventListener("orientationchange", update);
}

export function getPlayerName(): string {
  return localStorage.getItem("pp_name") || "";
}

export function setPlayerName(name: string): void {
  localStorage.setItem("pp_name", name.slice(0, 16));
}

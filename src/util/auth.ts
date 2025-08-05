export function isLoggedIn(): boolean {
  return !!localStorage.getItem("token");
}

export function logout(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("superAdmin");
}
import { app } from "../index";

export async function generateAuthToken(
  role: "admin" | "admin-food-court" | "tenant" | "customer" = "admin"
): Promise<string> {
  const credentials: Record<string, { email: string; pass: string }> = {
    admin: { email: "admin@foodcourt.com", pass: "password123" },
    "admin-food-court": { email: "manager@foodcourt.com", pass: "password123" },
    tenant: { email: "tenant@foodcourt.com", pass: "password123" },
    customer: { email: "customer@foodcourt.com", pass: "password123" },
  };

  const cred = credentials[role];
  if (cred) {
    const res = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cred.email, password: cred.pass }),
      })
    );
    if (res.status === 200) {
      const data = (await res.json()) as any;
      if (data?.data?.token) {
        return data.data.token;
      }
    }
  }

  // Fallback: register new temp user and login
  const random = Math.floor(Math.random() * 1000000);
  const email = `test_${role.replace("-", "_")}_${random}@foodcourt.com`;
  const password = "Password123!";
  await app.handle(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Test ${role}`,
        email,
        password,
        role,
      }),
    })
  );
  const loginRes = await app.handle(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
  );
  const json = (await loginRes.json()) as any;
  return json.data.token;
}

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as signupRoute } from "@/app/api/auth/signup/route";
import { POST as logoutRoute } from "@/app/api/auth/logout/route";
import { GET as meRoute } from "@/app/api/auth/me/route";
import { GET as getDocuments } from "@/app/api/documents/route";

function makeJsonRequest(
  url: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const reqInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (body !== undefined) {
    reqInit.body = JSON.stringify(body);
  }
  return new NextRequest(new Request(url, reqInit));
}

describe("Authentication & Demo Credentials API Integration Tests", () => {
  it("1. POST /api/auth/login allows Alice Vance demo credentials autofill login (HTTP 200)", async () => {
    const req = makeJsonRequest("http://localhost:3000/api/auth/login", "POST", {
      email: "alice@example.com",
      password: "password123",
    });

    const res = await loginRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.id).toBe("user_alice_123");
    expect(data.user.name).toBe("Alice Vance");
    expect(data.user.email).toBe("alice@example.com");

    const cookieHeader = res.headers.get("set-cookie");
    expect(cookieHeader).toBeDefined();
    expect(cookieHeader).toContain("ajaia_session_user");
  });

  it("2. POST /api/auth/login allows Bob Smith demo credentials autofill login (HTTP 200)", async () => {
    const req = makeJsonRequest("http://localhost:3000/api/auth/login", "POST", {
      email: "bob@example.com",
      password: "password123",
    });

    const res = await loginRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.id).toBe("user_bob_456");
    expect(data.user.name).toBe("Bob Smith");
  });

  it("3. POST /api/auth/login allows Charlie Day demo credentials autofill login (HTTP 200)", async () => {
    const req = makeJsonRequest("http://localhost:3000/api/auth/login", "POST", {
      email: "charlie@example.com",
      password: "password123",
    });

    const res = await loginRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.id).toBe("user_charlie_789");
    expect(data.user.name).toBe("Charlie Day");
  });

  it("4. POST /api/auth/login rejects unregistered emails because guest signin is disabled (HTTP 401)", async () => {
    const req = makeJsonRequest("http://localhost:3000/api/auth/login", "POST", {
      email: "unregistered_evaluator@agency.com",
      password: "password123",
    });

    const res = await loginRoute(req);
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toContain("No account found");
  });

  it("5. POST /api/auth/login rejects empty email (HTTP 400)", async () => {
    const req = makeJsonRequest("http://localhost:3000/api/auth/login", "POST", {
      email: "",
    });

    const res = await loginRoute(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("6. GET /api/auth/me identifies authenticated user via header (HTTP 200)", async () => {
    const req = makeJsonRequest("http://localhost:3000/api/auth/me", "GET", undefined, {
      "x-user-id": "user_alice_123",
    });

    const res = await meRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.user.id).toBe("user_alice_123");
    expect(data.user.name).toBe("Alice Vance");
  });

  it("7. GET /api/auth/me returns 401 when no session or header provided", async () => {
    const req = makeJsonRequest("http://localhost:3000/api/auth/me", "GET");

    const res = await meRoute(req);
    expect(res.status).toBe(401);
  });

  it("8. POST /api/auth/logout successfully clears user session (HTTP 200)", async () => {
    const req = makeJsonRequest("http://localhost:3000/api/auth/logout", "POST");
    const res = await logoutRoute();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("9. GET /api/auth/me identifies user from session cookie (HTTP 200)", async () => {
    const userCookie = JSON.stringify({
      id: "user_bob_456",
      name: "Bob Smith",
      email: "bob@example.com",
    });
    const req = new NextRequest(new Request("http://localhost:3000/api/auth/me", {
      headers: {
        cookie: `ajaia_session_user=${encodeURIComponent(userCookie)}`,
      },
    }));

    const res = await meRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.user.id).toBe("user_bob_456");
    expect(data.user.name).toBe("Bob Smith");
  });

  it("10. GET /api/documents authenticates requests using session cookie alone (HTTP 200)", async () => {
    const userCookie = JSON.stringify({
      id: "user_alice_123",
      name: "Alice Vance",
      email: "alice@example.com",
    });
    const req = new NextRequest(new Request("http://localhost:3000/api/documents?filter=owned", {
      headers: {
        cookie: `ajaia_session_user=${encodeURIComponent(userCookie)}`,
      },
    }));

    const res = await getDocuments(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("11. POST /api/auth/signup creates a new user profile with session cookie (HTTP 201)", async () => {
    const testUserEmail = `newuser_${Date.now()}@testdomain.com`;
    const req = makeJsonRequest("http://localhost:3000/api/auth/signup", "POST", {
      name: "Marcus Aurelius",
      email: testUserEmail,
      password: "secretpassword123",
    });

    const res = await signupRoute(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.name).toBe("Marcus Aurelius");
    expect(data.user.email).toBe(testUserEmail);
    expect(data.user.initials).toBe("MA");
    expect(data.user.password).toBeUndefined(); // safe user omit password

    const cookieHeader = res.headers.get("set-cookie");
    expect(cookieHeader).toBeDefined();
    expect(cookieHeader).toContain("ajaia_session_user");
  });

  it("12. POST /api/auth/signup rejects invalid/short names (HTTP 400)", async () => {
    const req = makeJsonRequest("http://localhost:3000/api/auth/signup", "POST", {
      name: "A",
      email: "valid@email.com",
      password: "validpassword123",
    });

    const res = await signupRoute(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("13. POST /api/auth/signup rejects malformed email addresses (HTTP 400)", async () => {
    const req = makeJsonRequest("http://localhost:3000/api/auth/signup", "POST", {
      name: "Valid Name",
      email: "invalid-email-format",
      password: "validpassword123",
    });

    const res = await signupRoute(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("14. POST /api/auth/signup rejects passwords under 6 characters (HTTP 400)", async () => {
    const req = makeJsonRequest("http://localhost:3000/api/auth/signup", "POST", {
      name: "Valid Name",
      email: "valid@example.com",
      password: "123",
    });

    const res = await signupRoute(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("15. POST /api/auth/signup prevents duplicate email registration (HTTP 409)", async () => {
    const duplicateEmail = `dup_${Date.now()}@example.com`;

    // First signup
    const req1 = makeJsonRequest("http://localhost:3000/api/auth/signup", "POST", {
      name: "Original User",
      email: duplicateEmail,
      password: "password12345",
    });
    const res1 = await signupRoute(req1);
    expect(res1.status).toBe(201);

    // Second signup with same email
    const req2 = makeJsonRequest("http://localhost:3000/api/auth/signup", "POST", {
      name: "Imposter User",
      email: duplicateEmail,
      password: "password54321",
    });
    const res2 = await signupRoute(req2);
    expect(res2.status).toBe(409);

    const data2 = await res2.json();
    expect(data2.error).toContain("already exists");
  });

  it("16. POST /api/auth/login authenticates newly registered users (HTTP 200)", async () => {
    const registeredEmail = `login_test_${Date.now()}@example.com`;
    const registeredPass = "mySuperSecretPass123";

    // 1. Create account
    const signupReq = makeJsonRequest("http://localhost:3000/api/auth/signup", "POST", {
      name: "Elena Rostova",
      email: registeredEmail,
      password: registeredPass,
    });
    const signupRes = await signupRoute(signupReq);
    expect(signupRes.status).toBe(201);

    // 2. Sign in with created credentials
    const loginReq = makeJsonRequest("http://localhost:3000/api/auth/login", "POST", {
      email: registeredEmail,
      password: registeredPass,
    });
    const loginRes = await loginRoute(loginReq);
    expect(loginRes.status).toBe(200);

    const loginData = await loginRes.json();
    expect(loginData.success).toBe(true);
    expect(loginData.user.name).toBe("Elena Rostova");
    expect(loginData.user.email).toBe(registeredEmail);
  });

  it("17. POST /api/auth/login rejects incorrect passwords for registered users (HTTP 401)", async () => {
    const registeredEmail = `wrong_pass_${Date.now()}@example.com`;

    // 1. Create account
    const signupReq = makeJsonRequest("http://localhost:3000/api/auth/signup", "POST", {
      name: "Security Tester",
      email: registeredEmail,
      password: "correctpassword",
    });
    await signupRoute(signupReq);

    // 2. Attempt login with wrong password
    const loginReq = makeJsonRequest("http://localhost:3000/api/auth/login", "POST", {
      email: registeredEmail,
      password: "WRONG_PASSWORD_123",
    });
    const loginRes = await loginRoute(loginReq);
    expect(loginRes.status).toBe(401);

    const loginData = await loginRes.json();
    expect(loginData.error).toContain("Incorrect password");
  });

  it("18. POST /api/auth/login allows second account hraza5701@gmail.com with password 12345678 (HTTP 200)", async () => {
    const req = makeJsonRequest("http://localhost:3000/api/auth/login", "POST", {
      email: "hraza5701@gmail.com",
      password: "12345678",
    });

    const res = await loginRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.id).toBe("user_hraza_5701");
    expect(data.user.email).toBe("hraza5701@gmail.com");
    expect(data.user.name).toBe("Hraza");
  });

  it("19. POST /api/auth/login rejects incorrect password for hraza5701@gmail.com (HTTP 401)", async () => {
    const req = makeJsonRequest("http://localhost:3000/api/auth/login", "POST", {
      email: "hraza5701@gmail.com",
      password: "wrongpassword999",
    });

    const res = await loginRoute(req);
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toContain("Incorrect password");
  });
});

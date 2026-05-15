import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button, Form, Input, Alert, Card, Divider } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { useAuth } from "../auth/AuthContext.js";
import ThemeToggle from "../components/ThemeToggle.js";

interface LoginForm {
  email: string;
  password: string;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: LoginForm) {
    setLoading(true);
    setError(null);
    try {
      await login({ email: values.email, password: values.password });
      navigate("/dashboard");
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(
        e.response?.data?.error?.message ??
          "Login failed. Check your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: 16, right: 16 }}>
        <ThemeToggle />
      </div>

      <Card
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 16,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--accent-primary)",
              marginBottom: 4,
            }}
          >
            Looki
          </div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Phone Number Intelligence
          </div>
        </div>

        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            style={{ marginBottom: 20, borderRadius: 8 }}
          />
        )}

        <Form<LoginForm>
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Enter a valid email" },
            ]}
          >
            <Input
              prefix={
                <MailOutlined style={{ color: "var(--text-secondary)" }} />
              }
              placeholder="Email address"
              size="large"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Password is required" }]}
          >
            <Input.Password
              prefix={
                <LockOutlined style={{ color: "var(--text-secondary)" }} />
              }
              placeholder="Password"
              size="large"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
              style={{
                background: "var(--accent-primary)",
                borderColor: "var(--accent-primary)",
                color: "#fff",
                fontWeight: 600,
                height: 44,
                borderRadius: 8,
              }}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ borderColor: "var(--border)", margin: "20px 0" }} />

        <div
          style={{
            textAlign: "center",
            fontSize: 14,
            color: "var(--text-secondary)",
          }}
        >
          Don't have an account?{" "}
          <Link
            to="/register"
            style={{ color: "var(--accent-primary)", fontWeight: 500 }}
          >
            Register
          </Link>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: 24,
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          © 2026 Looki / Mohamed Ali
        </div>
      </Card>
    </div>
  );
}

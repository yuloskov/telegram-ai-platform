import Head from "next/head";
import { useState } from "react";
import { useRouter } from "next/router";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Phone, Key, Lock, CheckCircle, Download, Upload } from "lucide-react";
import Link from "next/link";
import { AdminLayout } from "~/components/layout";
import {
  Card,
  CardContent,
  Button,
  Input,
  Spinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui";

type Step = "phone" | "code" | "password" | "success";

async function sendCode(phone: string) {
  const res = await fetch("/api/sessions/auth/send-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

async function verifyCode(params: { authSessionId: string; code: string; password?: string }) {
  const res = await fetch("/api/sessions/auth/verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

async function createSessionManual(phone: string, sessionString: string) {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, sessionString }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

async function importAuthKey(authKey: string, dcId: number) {
  const res = await fetch("/api/sessions/auth/import-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authKey, dcId }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

async function importTelethonFile(file: File) {
  const buffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

  const res = await fetch("/api/sessions/auth/import-telethon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileContent: base64 }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export default function CreateSessionPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"auth" | "manual" | "authkey" | "telethon">("telethon");
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [authSessionId, setAuthSessionId] = useState("");
  const [manualSessionString, setManualSessionString] = useState("");
  const [authKey, setAuthKey] = useState("");
  const [dcId, setDcId] = useState(2);
  const [error, setError] = useState("");
  const [telethonFile, setTelethonFile] = useState<File | null>(null);

  const sendCodeMutation = useMutation({
    mutationFn: sendCode,
    onSuccess: (data) => {
      setAuthSessionId(data.authSessionId);
      setStep("code");
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  const verifyCodeMutation = useMutation({
    mutationFn: verifyCode,
    onSuccess: (data) => {
      if (data.requiresPassword) {
        setStep("password");
      } else if (data.completed) {
        setStep("success");
      }
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  const manualMutation = useMutation({
    mutationFn: () => createSessionManual(phone, manualSessionString),
    onSuccess: () => {
      setStep("success");
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  const authKeyMutation = useMutation({
    mutationFn: () => importAuthKey(authKey, dcId),
    onSuccess: () => {
      setStep("success");
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  const telethonMutation = useMutation({
    mutationFn: () => {
      if (!telethonFile) throw new Error("No file selected");
      return importTelethonFile(telethonFile);
    },
    onSuccess: () => {
      setStep("success");
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    sendCodeMutation.mutate(phone);
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    verifyCodeMutation.mutate({ authSessionId, code });
  };

  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    verifyCodeMutation.mutate({ authSessionId, code, password });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    manualMutation.mutate();
  };

  const handleAuthKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    authKeyMutation.mutate();
  };

  const handleTelethonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    telethonMutation.mutate();
  };

  return (
    <>
      <Head>
        <title>Add Session - Admin Panel</title>
      </Head>
      <AdminLayout>
        <div className="max-w-xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/sessions">
              <Button variant="secondary" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Add Telegram Session</h1>
              <p className="text-[var(--text-secondary)]">
                Create a new MTProto session for scraping
              </p>
            </div>
          </div>

          {step === "success" ? (
            <SuccessCard onContinue={() => router.push("/sessions")} />
          ) : (
            <>
              <ModeSelector mode={mode} onModeChange={setMode} />

              <Card>
                <CardContent className="pt-6">
                  {mode === "telethon" && (
                    <TelethonFlow
                      file={telethonFile}
                      error={error}
                      isLoading={telethonMutation.isPending}
                      onFileChange={setTelethonFile}
                      onSubmit={handleTelethonSubmit}
                    />
                  )}
                  {mode === "authkey" && (
                    <AuthKeyFlow
                      authKey={authKey}
                      dcId={dcId}
                      error={error}
                      isLoading={authKeyMutation.isPending}
                      onAuthKeyChange={setAuthKey}
                      onDcIdChange={setDcId}
                      onSubmit={handleAuthKeySubmit}
                    />
                  )}
                  {mode === "manual" && (
                    <ManualFlow
                      phone={phone}
                      sessionString={manualSessionString}
                      error={error}
                      isLoading={manualMutation.isPending}
                      onPhoneChange={setPhone}
                      onSessionStringChange={setManualSessionString}
                      onSubmit={handleManualSubmit}
                    />
                  )}
                  {mode === "auth" && (
                    <AuthFlow
                      step={step}
                      phone={phone}
                      code={code}
                      password={password}
                      error={error}
                      isLoading={sendCodeMutation.isPending || verifyCodeMutation.isPending}
                      onPhoneChange={setPhone}
                      onCodeChange={setCode}
                      onPasswordChange={setPassword}
                      onSendCode={handleSendCode}
                      onVerifyCode={handleVerifyCode}
                      onSubmitPassword={handleSubmitPassword}
                    />
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </AdminLayout>
    </>
  );
}

interface ModeSelectorProps {
  mode: "auth" | "manual" | "authkey" | "telethon";
  onModeChange: (mode: "auth" | "manual" | "authkey" | "telethon") => void;
}

function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant={mode === "telethon" ? "default" : "secondary"}
        onClick={() => onModeChange("telethon")}
      >
        <Upload className="h-4 w-4 mr-2" />
        Telethon File
      </Button>
      <Button
        variant={mode === "authkey" ? "default" : "secondary"}
        onClick={() => onModeChange("authkey")}
      >
        <Download className="h-4 w-4 mr-2" />
        Auth Key
      </Button>
      <Button
        variant={mode === "manual" ? "default" : "secondary"}
        onClick={() => onModeChange("manual")}
      >
        <Key className="h-4 w-4 mr-2" />
        Session String
      </Button>
      <Button
        variant={mode === "auth" ? "default" : "secondary"}
        onClick={() => onModeChange("auth")}
      >
        <Phone className="h-4 w-4 mr-2" />
        Phone Auth
      </Button>
    </div>
  );
}

interface AuthFlowProps {
  step: Step;
  phone: string;
  code: string;
  password: string;
  error: string;
  isLoading: boolean;
  onPhoneChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSendCode: (e: React.FormEvent) => void;
  onVerifyCode: (e: React.FormEvent) => void;
  onSubmitPassword: (e: React.FormEvent) => void;
}

function AuthFlow({
  step,
  phone,
  code,
  password,
  error,
  isLoading,
  onPhoneChange,
  onCodeChange,
  onPasswordChange,
  onSendCode,
  onVerifyCode,
  onSubmitPassword,
}: AuthFlowProps) {
  return (
    <div className="space-y-6">
      <StepIndicator currentStep={step} />

      {error && (
        <div className="p-4 rounded-[var(--radius-md)] bg-[#fef2f2] text-[#991b1b] text-sm">
          {error}
        </div>
      )}

      {step === "phone" && (
        <form onSubmit={onSendCode} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Phone Number
            </label>
            <Input
              type="tel"
              placeholder="+1234567890"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Enter phone in international format with country code
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading || !phone}>
            {isLoading ? <Spinner size="sm" /> : "Send Code"}
          </Button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={onVerifyCode} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Verification Code
            </label>
            <Input
              type="text"
              placeholder="12345"
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Enter the code sent to your Telegram app
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading || !code}>
            {isLoading ? <Spinner size="sm" /> : "Verify Code"}
          </Button>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={onSubmitPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Two-Factor Password
            </label>
            <Input
              type="password"
              placeholder="Your 2FA password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              This account has 2FA enabled. Enter your password.
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading || !password}>
            {isLoading ? <Spinner size="sm" /> : "Submit Password"}
          </Button>
        </form>
      )}
    </div>
  );
}

interface StepIndicatorProps {
  currentStep: Step;
}

function StepIndicator({ currentStep }: StepIndicatorProps) {
  const steps = [
    { key: "phone", label: "Phone", icon: Phone },
    { key: "code", label: "Code", icon: Key },
    { key: "password", label: "2FA", icon: Lock },
  ];

  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === currentIndex;
        const isComplete = index < currentIndex;

        return (
          <div key={step.key} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                isActive
                  ? "bg-[var(--accent-primary)] text-white"
                  : isComplete
                    ? "bg-[var(--success)] text-white"
                    : "bg-[var(--bg-secondary)] text-[var(--text-tertiary)]"
              }`}
            >
              {isComplete ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-16 h-1 mx-2 rounded ${
                  index < currentIndex ? "bg-[var(--success)]" : "bg-[var(--bg-secondary)]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ManualFlowProps {
  phone: string;
  sessionString: string;
  error: string;
  isLoading: boolean;
  onPhoneChange: (value: string) => void;
  onSessionStringChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

function ManualFlow({
  phone,
  sessionString,
  error,
  isLoading,
  onPhoneChange,
  onSessionStringChange,
  onSubmit,
}: ManualFlowProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="p-4 rounded-[var(--radius-md)] bg-[#fef2f2] text-[#991b1b] text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Phone Number
        </label>
        <Input
          type="tel"
          placeholder="+1234567890"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Session String
        </label>
        <textarea
          placeholder="Paste your session string here..."
          value={sessionString}
          onChange={(e) => onSessionStringChange(e.target.value)}
          disabled={isLoading}
          rows={4}
          className="w-full rounded-[var(--radius-md)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
        />
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Paste an existing session string from another MTProto client
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading || !phone || !sessionString}>
        {isLoading ? <Spinner size="sm" /> : "Create Session"}
      </Button>
    </form>
  );
}

interface AuthKeyFlowProps {
  authKey: string;
  dcId: number;
  error: string;
  isLoading: boolean;
  onAuthKeyChange: (value: string) => void;
  onDcIdChange: (value: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

function AuthKeyFlow({
  authKey,
  dcId,
  error,
  isLoading,
  onAuthKeyChange,
  onDcIdChange,
  onSubmit,
}: AuthKeyFlowProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="p-4 rounded-[var(--radius-md)] bg-[#fef2f2] text-[#991b1b] text-sm">
          {error}
        </div>
      )}

      <div className="p-4 rounded-[var(--radius-md)] bg-[#f0f9ff] text-[#0369a1] text-sm">
        <strong>No phone required.</strong> Import an existing auth key directly.
        The phone number will be retrieved automatically from the session.
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Auth Key (Hex)
        </label>
        <textarea
          placeholder="Paste your hex-encoded auth key here (512 hex characters)..."
          value={authKey}
          onChange={(e) => onAuthKeyChange(e.target.value)}
          disabled={isLoading}
          rows={4}
          className="w-full rounded-[var(--radius-md)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] font-mono"
        />
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          The auth key from TData or another MTProto client (256 bytes = 512 hex characters)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Data Center (DC)
        </label>
        <Select
          value={String(dcId)}
          onValueChange={(value) => onDcIdChange(parseInt(value, 10))}
          disabled={isLoading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select DC" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">DC1 - Miami</SelectItem>
            <SelectItem value="2">DC2 - Amsterdam (default)</SelectItem>
            <SelectItem value="3">DC3 - Miami</SelectItem>
            <SelectItem value="4">DC4 - Amsterdam</SelectItem>
            <SelectItem value="5">DC5 - Singapore</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Select the data center where the account is registered (usually DC2)
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading || !authKey}>
        {isLoading ? <Spinner size="sm" /> : "Import Session"}
      </Button>
    </form>
  );
}

interface TelethonFlowProps {
  file: File | null;
  error: string;
  isLoading: boolean;
  onFileChange: (file: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
}

function TelethonFlow({
  file,
  error,
  isLoading,
  onFileChange,
  onSubmit,
}: TelethonFlowProps) {
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    onFileChange(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0] || null;
    if (droppedFile && droppedFile.name.endsWith(".session")) {
      onFileChange(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="p-4 rounded-[var(--radius-md)] bg-[#fef2f2] text-[#991b1b] text-sm">
          {error}
        </div>
      )}

      <div className="p-4 rounded-[var(--radius-md)] bg-[#f0f9ff] text-[#0369a1] text-sm">
        <strong>Easiest method.</strong> Upload a Telethon/Pyrogram .session file directly.
        The auth key and DC will be extracted automatically.
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Session File
        </label>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`border-2 border-dashed rounded-[var(--radius-md)] p-8 text-center cursor-pointer transition-colors ${
            file
              ? "border-[var(--success)] bg-[#f0fdf4]"
              : "border-[var(--border)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-secondary)]"
          }`}
          onClick={() => document.getElementById("telethon-file-input")?.click()}
        >
          <input
            id="telethon-file-input"
            type="file"
            accept=".session"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isLoading}
          />
          {file ? (
            <div className="space-y-2">
              <CheckCircle className="h-8 w-8 mx-auto text-[var(--success)]" />
              <p className="text-sm font-medium text-[var(--text-primary)]">{file.name}</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-8 w-8 mx-auto text-[var(--text-tertiary)]" />
              <p className="text-sm text-[var(--text-secondary)]">
                Drop your .session file here or click to browse
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Supports Telethon and Pyrogram session files
              </p>
            </div>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading || !file}>
        {isLoading ? <Spinner size="sm" /> : "Import Session"}
      </Button>
    </form>
  );
}

interface SuccessCardProps {
  onContinue: () => void;
}

function SuccessCard({ onContinue }: SuccessCardProps) {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--success)] flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Session Created!</h2>
        <p className="text-[var(--text-secondary)] mb-6">
          Your Telegram session has been successfully created and is ready for scraping.
        </p>
        <Button onClick={onContinue}>Back to Sessions</Button>
      </CardContent>
    </Card>
  );
}

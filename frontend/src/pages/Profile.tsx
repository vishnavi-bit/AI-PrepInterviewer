import { useState, type FormEvent } from "react";
import { changePassword, updateProfile, uploadAvatar } from "../api/auth";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

type Notice = { kind: "ok" | "error"; text: string };

function errorText(err: unknown): string {
  return err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
}

export function Profile() {
  const { user, setUser, signOut } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [targetRole, setTargetRole] = useState(user?.target_role ?? "");
  const [profileNotice, setProfileNotice] = useState<Notice | null>(null);
  const [avatarNotice, setAvatarNotice] = useState<Notice | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordNotice, setPasswordNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setProfileNotice(null);
    try {
      setUser(await updateProfile({ name, target_role: targetRole.trim() || null }));
      setProfileNotice({ kind: "ok", text: "Profile saved." });
    } catch (err) {
      setProfileNotice({ kind: "error", text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  async function onAvatarChange(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setAvatarNotice(null);
    try {
      setUser(await uploadAvatar(file));
      setAvatarNotice({ kind: "ok", text: "Photo updated." });
    } catch (err) {
      setAvatarNotice({ kind: "error", text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  async function onPasswordSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setPasswordNotice(null);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setPasswordNotice({ kind: "ok", text: "Password changed. Other devices were signed out." });
    } catch (err) {
      setPasswordNotice({ kind: "error", text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <h1>Your profile</h1>
        <div className="avatar-row">
          {user.avatar_url ? (
            <img className="avatar" src={user.avatar_url} alt="Your profile photo" />
          ) : (
            <div className="avatar avatar-empty" aria-hidden="true">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <label className="file-button">
            Change photo
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              onChange={(e) => void onAvatarChange(e.target.files?.[0])}
            />
          </label>
        </div>
        {avatarNotice && <Message notice={avatarNotice} />}

        <form onSubmit={saveProfile} noValidate>
          <label>
            Email
            <input value={user.email} readOnly />
            <span className="hint">Email cannot be changed.</span>
          </label>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Target role
            <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} maxLength={100} />
          </label>
          {profileNotice && <Message notice={profileNotice} />}
          <div className="actions">
            <button type="submit" disabled={busy}>Save</button>
            <button type="button" className="secondary" disabled={busy} onClick={() => void signOut()}>
              Log out
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Change password</h2>
        <form onSubmit={onPasswordSubmit} noValidate>
          <label>
            Current password
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            New password
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <span className="hint">At least 8 characters.</span>
          </label>
          {passwordNotice && <Message notice={passwordNotice} />}
          <button type="submit" disabled={busy}>Update password</button>
        </form>
      </section>
    </div>
  );
}

function Message({ notice }: { notice: Notice }) {
  return (
    <p className={notice.kind === "ok" ? "ok" : "error"} role={notice.kind === "error" ? "alert" : "status"}>
      {notice.text}
    </p>
  );
}

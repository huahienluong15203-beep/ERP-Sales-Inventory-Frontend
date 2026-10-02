import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import "./App.css";

type Account = {
  id: number;
  username: string;
  fullName: string;
  email: string;
  status: string;
  lockReason: string | null;
  lockUntil: string | null;
  roles: string[];
  handoverRequired: boolean;
};

type LoginResponse = {
  accessToken: string;
  id: number;
  fullName: string;
  username: string;
  roles: string[];
};

type UserProfile = {
  id: number;
  username: string;
  fullName: string;
  avatarKey: string | null;
  roles: string[];
  avatarUrl: string | null;
  thumbnailUrl: string | null;
};

type AvatarControlsProps = {
  profile: Pick<UserProfile, "fullName" | "username" | "avatarKey">;
  avatarUrl: string;
  uploading: boolean;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
};

const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png"] as const;
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

async function apiRequest<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message ?? data.detail ?? "Không thể hoàn tất yêu cầu.");
  }
  return data as T;
}

function createSquareAvatarFile(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const image = new Image();
      image.onload = () => {
        const size = Math.min(image.width, image.height);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Không thể xử lý ảnh này."));
          return;
        }

        const offsetX = (image.width - size) / 2;
        const offsetY = (image.height - size) / 2;
        context.fillStyle = "#f3f4f6";
        context.fillRect(0, 0, size, size);
        context.drawImage(image, offsetX, offsetY, size, size, 0, 0, size, size);

        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Không thể tạo ảnh vuông cho hồ sơ."));
            return;
          }

          const fileName = file.name.replace(/\.[^.]+$/, "") || "avatar";
          const processedFile = new File([blob], `${fileName}.${mimeType === "image/png" ? "png" : "jpg"}`, {
            type: mimeType,
            lastModified: Date.now(),
          });
          resolve(processedFile);
        }, mimeType, 0.92);
      };
      image.onerror = () => reject(new Error("Không thể đọc ảnh được chọn."));
      image.src = dataUrl;
    };
    reader.onerror = () => reject(new Error("Không thể đọc ảnh được chọn."));
    reader.readAsDataURL(file);
  });
}

function AvatarControls({ profile, avatarUrl, uploading, onUpload }: AvatarControlsProps) {
  return (
    <div className="profile-tools">
      {profile.avatarKey && avatarUrl ? <img className="profile-avatar" src={avatarUrl} alt={`Ảnh đại diện ${profile.fullName}`} /> : <span className="profile-avatar profile-avatar-fallback">{(profile.fullName || profile.username).slice(0, 1).toLocaleUpperCase("vi")}</span>}
      <span className="profile-name">{profile.fullName || profile.username}</span>
      <label className="button button-quiet avatar-upload-button">
        {uploading ? "Đang tải..." : "Đổi ảnh"}
        <input type="file" accept="image/jpeg,image/png" onChange={(event) => onUpload(event)} disabled={uploading} aria-label="Tải ảnh đại diện lên" />
      </label>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("erp_access_token") ?? "");
  const [profile, setProfile] = useState(() => ({
    id: Number(localStorage.getItem("erp_user_id") ?? 0),
    fullName: localStorage.getItem("erp_full_name") ?? "",
    username: localStorage.getItem("erp_username") ?? "",
    avatarKey: "",
    roles: [] as string[],
    avatarUrl: null as string | null,
    thumbnailUrl: null as string | null,
  }));
  const [profileReady, setProfileReady] = useState(() => !localStorage.getItem("erp_access_token"));
  const [avatarUrl, setAvatarUrl] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [query, setQuery] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [lockReason, setLockReason] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem("erp_access_token")));
  const isAdmin = profile.roles.includes("ROLE_ADMIN");

  useEffect(() => {
    if (!token || !profileReady || !isAdmin) return;
    let active = true;
    apiRequest<Account[]>("/api/admin/users", token)
      .then((data) => {
        if (active) {
          setAccounts(data);
          setError("");
        }
      })
      .catch((requestError: Error) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, profileReady, isAdmin]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    apiRequest<UserProfile>("/api/v1/users/me", token)
      .then((user) => {
        if (active) {
          setProfile({ ...user, avatarKey: user.avatarKey ?? "" });
        }
      })
      .catch((requestError: Error) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setProfileReady(true);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !profile.id || !profile.avatarKey) {
      return;
    }
    let active = true;
    let objectUrl = "";
    fetch(`${apiBase}/api/v1/users/${profile.id}/avatar?thumbnail=true`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Không thể tải ảnh đại diện.");
        return URL.createObjectURL(await response.blob());
      })
      .then((url) => {
        if (active) {
          objectUrl = url;
          setAvatarUrl(url);
        } else {
          URL.revokeObjectURL(url);
        }
      })
      .catch(() => {
        if (active) setAvatarUrl("");
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token, profile.id, profile.avatarKey]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginName, password: loginPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Đăng nhập không thành công.");
      const result = data as LoginResponse;
      localStorage.setItem("erp_access_token", result.accessToken);
      localStorage.setItem("erp_user_id", String(result.id));
      localStorage.setItem("erp_full_name", result.fullName);
      localStorage.setItem("erp_username", result.username);
      setProfile({
        id: result.id,
        fullName: result.fullName,
        username: result.username,
        avatarKey: "",
        roles: result.roles,
        avatarUrl: null,
        thumbnailUrl: null,
      });
      setProfileReady(true);
      setToken(result.accessToken);
      setLoginPassword("");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Đăng nhập không thành công.");
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    localStorage.removeItem("erp_access_token");
    localStorage.removeItem("erp_user_id");
    localStorage.removeItem("erp_full_name");
    localStorage.removeItem("erp_username");
    setToken("");
    setAccounts([]);
    setProfile({ id: 0, fullName: "", username: "", avatarKey: "", roles: [], avatarUrl: null, thumbnailUrl: null });
    setProfileReady(true);
    setAvatarUrl("");
    setNotice("");
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setNotice("");

    if (!ACCEPTED_AVATAR_TYPES.includes(file.type as (typeof ACCEPTED_AVATAR_TYPES)[number])) {
      setError("Chỉ chấp nhận ảnh JPG hoặc PNG.");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setError("Ảnh không được vượt quá 2MB.");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const processedFile = await createSquareAvatarFile(file);
      const formData = new FormData();
      formData.append("file", processedFile, processedFile.name);
      const response = await fetch(`${apiBase}/api/v1/users/me/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message ?? data.detail ?? "Không thể cập nhật ảnh đại diện.");
      const updated = data as UserProfile;
      setProfile({ ...updated, avatarKey: updated.avatarKey ?? "" });
      setNotice("Đã cập nhật ảnh đại diện. Ảnh đã được cắt vuông và chuẩn hóa để hiển thị rõ trên lịch sử tạo đơn.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Không thể cập nhật ảnh đại diện.");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function unlockAccount(account: Account) {
    setBusyId(account.id);
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<Account>(`/api/admin/users/${account.id}/unlock`, token, {
        method: "PATCH",
      });
      setAccounts((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(`Đã mở khóa tài khoản ${account.username}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể mở khóa tài khoản.");
    } finally {
      setBusyId(null);
    }
  }

  async function lockAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAccount) return;
    setBusyId(selectedAccount.id);
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<Account>(`/api/admin/users/${selectedAccount.id}/lock`, token, {
        method: "PATCH",
        body: JSON.stringify({ reason: lockReason }),
      });
      setAccounts((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(`Đã khóa tài khoản ${selectedAccount.username}. Cần bàn giao các đại lý đang phụ trách.`);
      setSelectedAccount(null);
      setLockReason("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể khóa tài khoản.");
    } finally {
      setBusyId(null);
    }
  }

  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const visibleAccounts = accounts.filter((account) =>
    [account.fullName, account.username, account.email].some((value) =>
      value.toLocaleLowerCase("vi").includes(normalizedQuery),
    ),
  );
  const handoverCount = accounts.filter((account) => account.handoverRequired).length;

  if (!token) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div className="brand-mark" aria-label="ERP Sales and Inventory">ES</div>
          <p className="eyebrow">ERP · SALES &amp; INVENTORY</p>
          <h1>Đăng nhập hệ thống.</h1>
          <p className="login-copy">Sử dụng tài khoản được cấp để tiếp tục.</p>
          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="login-name">Tên đăng nhập</label>
            <input id="login-name" autoComplete="username" value={loginName} onChange={(event) => setLoginName(event.target.value)} required />
            <label htmlFor="login-password">Mật khẩu</label>
            <input id="login-password" type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required />
            {error && <p className="feedback feedback-error" role="alert">{error}</p>}
            <button className="button button-primary login-submit" type="submit" disabled={loading}>
              {loading ? "Đang xác thực..." : "Đăng nhập"}
            </button>
          </form>
          <p className="login-footnote">API: {apiBase}</p>
        </section>
        <aside className="login-aside">
          <div className="aside-orbit orbit-one" />
          <div className="aside-orbit orbit-two" />
          <span className="aside-index">ACCESS CONTROL / 01</span>
          <div className="aside-content">
            <span className="aside-rule" />
            <p>QUYỀN TRUY CẬP</p>
            <h2>Một quyết định.<br />Hiệu lực tức thì.</h2>
            <span>Phiên đang mở bị vô hiệu khi tài khoản được khóa.</span>
          </div>
          <span className="aside-foot">SALES &amp; INVENTORY SYSTEM</span>
        </aside>
      </main>
    );
  }

  if (!profileReady) {
    return <main className="profile-loading" role="status">Đang tải hồ sơ...</main>;
  }

  if (!isAdmin) {
    return (
      <main className="admin-shell">
        <header className="topbar">
          <a className="wordmark" href="#profile" aria-label="ERP Sales and Inventory">ERP<span>/</span>OPS</a>
          <div className="topbar-right">
            <AvatarControls profile={profile} avatarUrl={avatarUrl} uploading={isUploadingAvatar} onUpload={(event) => void uploadAvatar(event)} />
            <button className="button button-quiet" type="button" onClick={signOut}>Đăng xuất</button>
          </div>
        </header>
        <div className="page-wrap" id="profile">
          <div className="page-heading">
            <div>
              <p className="eyebrow">HỒ SƠ TÀI KHOẢN</p>
              <h1>{profile.fullName}</h1>
              <p className="page-description">{profile.username}</p>
            </div>
            <div className="role-list">{profile.roles.map((role) => <span key={role}>{role.replace("ROLE_", "").replaceAll("_", " ")}</span>)}</div>
          </div>
          {error && <p className="feedback feedback-error" role="alert">{error}</p>}
          {notice && <p className="feedback feedback-success" role="status">{notice}</p>}
          <section className="self-profile">
            {profile.avatarKey && avatarUrl ? <img className="self-profile-avatar" src={avatarUrl} alt={`Ảnh đại diện ${profile.fullName}`} /> : <span className="self-profile-avatar self-profile-avatar-fallback">{(profile.fullName || profile.username).slice(0, 1).toLocaleUpperCase("vi")}</span>}
            <AvatarControls profile={profile} avatarUrl={avatarUrl} uploading={isUploadingAvatar} onUpload={(event) => void uploadAvatar(event)} />
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <header className="topbar">
        <a className="wordmark" href="#accounts" aria-label="ERP quản trị">ERP<span>/</span>OPS</a>
        <div className="topbar-right">
          <span className="secure-label"><span className="secure-dot" />QUẢN TRỊ VIÊN</span>
          <AvatarControls profile={profile} avatarUrl={avatarUrl} uploading={isUploadingAvatar} onUpload={(event) => void uploadAvatar(event)} />
          <button className="button button-quiet" type="button" onClick={signOut}>Đăng xuất</button>
        </div>
      </header>

      <div className="page-wrap" id="accounts">
        <div className="page-heading">
          <div>
            <p className="eyebrow">NHÂN SỰ / QUYỀN TRUY CẬP</p>
            <h1>Tài khoản nhân viên</h1>
            <p className="page-description">Quản lý quyền truy cập và trạng thái hoạt động trong hệ thống.</p>
          </div>
          <div className="account-total"><strong>{accounts.length.toString().padStart(2, "0")}</strong><span>TÀI KHOẢN</span></div>
        </div>

        {handoverCount > 0 && (
          <section className="handover-banner" aria-live="polite">
            <span className="banner-symbol">!</span>
            <div>
              <strong>{handoverCount} tài khoản cần bàn giao</strong>
              <p>Đại lý do nhân viên bị khóa phụ trách cần được chuyển giao.</p>
            </div>
            <a href="#handover" className="banner-link">Xem danh sách <span aria-hidden="true">→</span></a>
          </section>
        )}

        {error && <p className="feedback feedback-error" role="alert">{error}</p>}
        {notice && <p className="feedback feedback-success" role="status">{notice}</p>}

        <section className="account-section" id="handover" aria-label="Danh sách tài khoản">
          <div className="table-toolbar">
            <div className="table-title">
              <h2>Danh sách tài khoản</h2>
              <span>{visibleAccounts.length} kết quả</span>
            </div>
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input type="search" placeholder="Tìm tên, username, email" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>NHÂN VIÊN</th><th>VAI TRÒ</th><th>TRẠNG THÁI</th><th>LÝ DO / BÀN GIAO</th><th><span className="sr-only">Thao tác</span></th></tr>
              </thead>
              <tbody>
                {loading && accounts.length === 0 ? (
                  <tr><td className="empty-state" colSpan={5}>Đang tải tài khoản...</td></tr>
                ) : visibleAccounts.length === 0 ? (
                  <tr><td className="empty-state" colSpan={5}>Không tìm thấy tài khoản phù hợp.</td></tr>
                ) : visibleAccounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <div className="person-cell">
                        <span className={`avatar ${account.status === "LOCKED" ? "avatar-muted" : ""}`}>{account.fullName.slice(0, 1).toLocaleUpperCase("vi")}</span>
                        <span><strong>{account.fullName}</strong><small>{account.username} · {account.email}</small></span>
                      </div>
                    </td>
                    <td><div className="role-list">{account.roles.length ? account.roles.map((role) => <span key={role}>{role.replace("ROLE_", "").replaceAll("_", " ")}</span>) : <span>Chưa phân quyền</span>}</div></td>
                    <td><span className={`status-pill ${account.status === "LOCKED" ? "status-locked" : "status-active"}`}><span />{account.status === "LOCKED" ? "Đã khóa" : "Hoạt động"}</span></td>
                    <td>
                      {account.handoverRequired ? (
                        <div className="handover-cell"><strong>{account.lockReason}</strong><span>Cần bàn giao đại lý</span></div>
                      ) : account.status === "LOCKED" ? (
                        <span className="temporary-lock">
                          {account.lockUntil ? "Tạm khóa do đăng nhập sai" : account.lockReason ?? "Đã khóa bởi quản trị viên"}
                        </span>
                      ) : <span className="no-reason">—</span>}
                    </td>
                    <td className="action-cell">
                      {account.status === "LOCKED" ? (
                        <button className="button button-unlock" type="button" disabled={busyId === account.id} onClick={() => void unlockAccount(account)}>Mở khóa</button>
                      ) : (
                        <button className="button button-lock" type="button" disabled={busyId === account.id} onClick={() => { setSelectedAccount(account); setLockReason(""); setError(""); }}>Khóa tài khoản</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="table-note">Tài khoản khóa không thể đăng nhập hoặc tiếp tục sử dụng phiên hiện tại.</p>
        </section>
      </div>

      {selectedAccount && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedAccount(null); }}>
          <section className="lock-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            <button className="dialog-close" type="button" aria-label="Đóng" onClick={() => setSelectedAccount(null)}>×</button>
            <p className="eyebrow">THAY ĐỔI TRẠNG THÁI</p>
            <h2 id="dialog-title">Khóa tài khoản</h2>
            <p className="dialog-copy">{selectedAccount.fullName} sẽ bị đăng xuất khỏi các phiên hiện tại.</p>
            <form onSubmit={lockAccount}>
              <label htmlFor="lock-reason">Lý do khóa <span>*</span></label>
              <textarea id="lock-reason" value={lockReason} onChange={(event) => setLockReason(event.target.value)} maxLength={500} rows={4} placeholder="Nhập lý do để lưu vào hồ sơ tài khoản" required />
              <div className="character-count">{lockReason.length}/500</div>
              <div className="dialog-warning"><strong>Cần bàn giao</strong><span>Đại lý do nhân viên này phụ trách cần được chuyển giao.</span></div>
              <div className="dialog-actions">
                <button className="button button-quiet" type="button" onClick={() => setSelectedAccount(null)}>Hủy</button>
                <button className="button button-danger" type="submit" disabled={busyId === selectedAccount.id || !lockReason.trim()}>{busyId === selectedAccount.id ? "Đang xử lý..." : "Xác nhận khóa"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;

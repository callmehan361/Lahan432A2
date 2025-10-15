import { login } from './auth.js';
import { apiFetch } from './api.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const uploadForm = document.getElementById('uploadForm');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    await login(username, password);
    alert('Logged in successfully!');
  });

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = e.target.video.files[0];
    const targetFormat = e.target.format.value;

    if (!file) return alert('Select a video file first.');

    // 1️⃣ Get presigned upload URL
    const presign = await apiFetch('/uploads/presign', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, contentType: file.type })
    });

    // 2️⃣ Upload directly to S3
    await fetch(presign.url, { method: 'PUT', body: file });
    alert('Upload completed.');

    // 3️⃣ Create transcoding job
    const job = await apiFetch('/jobs', {
      method: 'POST',
      body: JSON.stringify({ inputKey: presign.key, targetFormat })
    });

    document.getElementById('jobId').innerText = job.jobId;

    // 4️⃣ Poll for job status
    const statusEl = document.getElementById('status');
    const downloadDiv = document.getElementById('download');

    const poll = setInterval(async () => {
      const jobInfo = await apiFetch(`/jobs/${job.jobId}`);
      statusEl.innerText = jobInfo.status;

      if (jobInfo.status === 'COMPLETED') {
        clearInterval(poll);
        const link = document.createElement('a');
        link.href = `${API_BASE}/downloads/${job.jobId}`;
        link.innerText = '⬇️ Download Transcoded Video';
        link.target = '_blank';
        downloadDiv.appendChild(link);
      }
    }, 4000);
  });
});

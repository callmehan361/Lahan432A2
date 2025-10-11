// web/src/App.js
// Main React UI for the Video Transcoder frontend

import { useState } from 'react';
import { login } from './auth';
import { getPresign, createJob, getJob, listVideos } from './api';

export default function App() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('');
  const [jobId, setJobId] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState('');

  /**
   * Handle user login
   */
  async function doLogin(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    const username = f.get('u');
    const password = f.get('p');
    try {
      const { idToken } = await login(username, password);
      setToken(idToken);
      setUser(username);
      alert(' Login successful');
    } catch (err) {
      alert(' Login failed: ' + err.message);
    }
  }

  /**
   * Handle video upload and start transcoding job
   */
  async function uploadAndStart(e) {
    e.preventDefault();
    const file = document.getElementById('file').files?.[0];
    if (!file || !token) {
      alert('Please login and select a file first');
      return;
    }

    setLoading(true);
    setStatus('Uploading...');

    try {
      // Step 1: Get presigned URL
      const { url, key } = await getPresign(token, file.name, file.type);

      // Step 2: Upload directly to S3
      await fetch(url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });

      // Step 3: Create transcoding job
      const job = await createJob(token, key, ['mp4_720p']);
      setJobId(job.jobId);
      setStatus('QUEUED');

      // Step 4: Poll job status every 3 seconds
      const interval = setInterval(async () => {
        const j = await getJob(token, job.jobId);
        setStatus(j.status);

        if (j.status === 'COMPLETED' || j.status === 'FAILED') {
          clearInterval(interval);
          setLoading(false);
          const vids = await listVideos(token);
          setVideos(vids);
        }
      }, 3000);
    } catch (err) {
      console.error(' Upload error:', err);
      alert('Upload failed: ' + err.message);
      setLoading(false);
    }
  }

  return (
    <div style={{
      maxWidth: '680px',
      margin: '40px auto',
      fontFamily: 'Arial, sans-serif',
      padding: '20px'
    }}>
      <h1> Video Transcoder</h1>

      {!token && (
        <form onSubmit={doLogin} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <input name="u" placeholder="Username" required />
          <input name="p" placeholder="Password" type="password" required />
          <button type="submit">Login</button>
        </form>
      )}

      {token && (
        <>
          <p> Logged in as <b>{user}</b></p>
          <form onSubmit={uploadAndStart}>
            <input id="file" type="file" accept="video/*" required />
            <button type="submit" disabled={loading}>Upload & Start</button>
          </form>
        </>
      )}

      {jobId && (
        <div style={{ marginTop: '20px' }}>
          <p>Job ID: <code>{jobId}</code></p>
          <p>Status: <b>{status}</b></p>
          {loading && <p>Processing your video, please wait...</p>}
        </div>
      )}

      <hr style={{ margin: '30px 0' }} />

      <h2> My Videos</h2>
      {!videos.length && <p>No videos uploaded yet.</p>}

      <ul style={{ paddingLeft: '20px' }}>
        {videos.map(v => (
          <li key={v.jobId}>
            <b>{v.title || 'Untitled Video'}</b> — {v.status}
            {v.status === 'COMPLETED' && v.outputs?.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                {v.outputs.map(o => (
                  <div key={o.key}>
                    <a
                      href={`${import.meta.env.VITE_S3_PUBLIC_URL}/${o.key}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                       View {o.format}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

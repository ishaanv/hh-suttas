import { displayPage } from './bookmarks.js';

var CLIENT_ID = '1065533519078-548t1ldvduqnn92kie9qclndl80hlci1.apps.googleusercontent.com';
var API_KEY = 'AIzaSyBEJ72r7Y4o7qWQsV-tzfCVzE71ZlfbKfc';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient;
let gapiInited = false;
let gisInited = false;

document.getElementById('authorize_button').style.display = 'none';
document.getElementById('signout_button').style.display = 'none';

function gapiLoaded() {
  gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
  await gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: DISCOVERY_DOCS,
  });
  gapiInited = true;
  maybeEnableButtons();
}

function gisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: '', // defined later
  });
  gisInited = true;
  maybeEnableButtons();
}

function maybeEnableButtons() {
  if (gapiInited && gisInited) {
    document.getElementById('authorize_button').style.display = 'block';
  }
}

function handleAuthClick() {
  tokenClient.callback = async (resp) => {
    if (resp.error !== undefined) {
      throw resp;
    }
    document.getElementById('signout_button').style.display = 'block';
    document.getElementById('authorize_button').innerText = 'Refresh';
    // Use the token to make API calls
  };

  if (gapi.client.getToken() === null) {
    // Prompt the user to select a Google Account and ask for consent to share their data
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    // Skip display of the account chooser and consent dialog
    tokenClient.requestAccessToken({ prompt: '' });
  }
}

function handleSignoutClick() {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken('');
    document.getElementById('signout_button').style.display = 'none';
    document.getElementById('authorize_button').innerText = 'Authorize';
  }
}

async function handleCreateOrUpdateFile() {
  const bookmarksData = localStorage.getItem('bookmarksData');
  if (!bookmarksData) {
    alert('No bookmarks data found. Please add some bookmarks first.');
    return;
  }

  const file = new Blob([bookmarksData], { type: 'application/json' });

  let fileId = localStorage.getItem('fileId');
  if (fileId) {
    await updateFile(fileId, file);
  } else {
    await createFile(file);
  }
}

async function createFile(file) {
  const metadata = {
    name: 'SampleFile.txt',
    mimeType: 'text/plain',
  };

  const accessToken = gapi.client.getToken().access_token;
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: new Headers({ Authorization: 'Bearer ' + accessToken }),
    body: form,
  });
  const data = await response.json();
  localStorage.setItem('fileId', data.id);
  console.log('File ID:', data.id);
}

async function updateFile(fileId, file) {
  const metadata = {
    name: 'SampleFile.txt',
    mimeType: 'text/plain',
  };

  const accessToken = gapi.client.getToken().access_token;
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
    method: 'PATCH',
    headers: new Headers({ Authorization: 'Bearer ' + accessToken }),
    body: form,
  });
  const data = await response.json();
  console.log('File updated:', data.id);
}

async function handleReadFile() {
  const fileId = localStorage.getItem('fileId');
  if (!fileId) {
    alert('No file found. Please create a file first.');
    return;
  }

  const response = await gapi.client.drive.files.get({
    fileId: fileId,
    alt: 'media',
  });

  const fileContent = response.body;
  console.log('File content:', fileContent);

  try {
    const bookmarksData = JSON.parse(fileContent);
    localStorage.setItem('bookmarksData', JSON.stringify(bookmarksData));
    alert('Bookmarks data loaded successfully');
    displayPage(); // Assuming displayPage is a global function from bookmarks.js
  } catch (error) {
    console.error('Failed to parse bookmarks data:', error);
    alert('Failed to load bookmarks data: Invalid JSON');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('authorize_button').onclick = handleAuthClick;
  document.getElementById('signout_button').onclick = handleSignoutClick;
  document.getElementById('create_file_button').onclick = handleCreateOrUpdateFile;
  document.getElementById('read_file_button').onclick = handleReadFile;

  window.gapiLoaded = gapiLoaded;
  window.gisLoaded = gisLoaded;

  const script1 = document.createElement('script');
  script1.src = 'https://apis.google.com/js/api.js';
  script1.onload = gapiLoaded;
  document.body.appendChild(script1);

  const script2 = document.createElement('script');
  script2.src = 'https://accounts.google.com/gsi/client';
  script2.onload = gisLoaded;
  document.body.appendChild(script2);
});

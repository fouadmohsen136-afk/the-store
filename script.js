const filters = document.querySelectorAll('.filter');
const projectGrid = document.querySelector('.project-grid');
const remoteConfig = window.NEXA_SUPABASE || {};
const hasRemoteStorage = Boolean(remoteConfig.url && remoteConfig.anonKey && window.supabase);
const remoteClient = hasRemoteStorage ? window.supabase.createClient(remoteConfig.url, remoteConfig.anonKey) : null;
const useServerStorage = location.protocol === 'http:' || location.protocol === 'https:';

const applyFilter = (category) => {
  projectGrid.querySelectorAll('.project-card').forEach((project) => {
    project.classList.toggle('is-hidden', category !== 'all' && project.dataset.category !== category);
  });
};

const renderSavedProject = (savedProject, label = 'LOCAL') => {
  const project = document.createElement('article');
  project.className = 'project-card project-new reveal visible';
  project.dataset.category = savedProject.category;
  const image = document.createElement('div');
  image.className = 'project-image image-uploaded';
  const cover = savedProject.coverDataUrl || savedProject.coverUrl;
  if (cover) image.style.backgroundImage = `url(${cover})`;
  image.innerHTML = `${cover ? '' : '<span class="upload-symbol">✦</span>'}<span class="image-index">${label}</span>`;
  project.innerHTML = `<div class="project-meta"><div><h3>${savedProject.title}</h3><p>${savedProject.description} · ${savedProject.fileName || 'مشروع رقمي'}</p></div><span class="project-arrow">↗</span></div>`;
  project.prepend(image);
  projectGrid.prepend(project);
};

const loadLocalProjects = () => {
  const savedProjects = JSON.parse(localStorage.getItem('nexa-projects') || '[]');
  savedProjects.reverse().forEach((savedProject) => renderSavedProject(savedProject));
};

loadLocalProjects();

const loadRemoteProjects = async () => {
  if (!remoteClient) return;
  const { data } = await remoteClient.from('projects').select('*').order('created_at', { ascending: false });
  data?.forEach((savedProject) => {
    renderSavedProject({ ...savedProject, fileName: savedProject.file_name, coverDataUrl: savedProject.cover_url }, 'SYNC');
  });
};

loadRemoteProjects();

const loadServerProjects = async () => {
  if (!useServerStorage) return;
  try {
    const response = await fetch('/api/projects');
    if (response.ok) (await response.json()).reverse().forEach((project) => renderSavedProject(project, 'SYNC'));
  } catch { /* local mode remains available if the server API is unavailable */ }
};

loadServerProjects();

filters.forEach((filter) => {
  filter.addEventListener('click', () => {
    filters.forEach((item) => item.classList.remove('active'));
    filter.classList.add('active');
    applyFilter(filter.dataset.filter);
  });
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

document.querySelector('.load-more').addEventListener('click', (event) => {
  event.currentTarget.innerHTML = 'هذه هي الحكاية كاملة <span>✦</span>';
  event.currentTarget.disabled = true;
});

const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
menuToggle.addEventListener('click', () => {
  nav.classList.toggle('mobile-open');
});

const uploadPanel = document.querySelector('.upload-panel');
const uploadForm = document.querySelector('#upload-form');
const uploadTrigger = document.querySelector('.upload-trigger');
const uploadClose = document.querySelector('.upload-close');

uploadTrigger.addEventListener('click', () => {
  uploadPanel.hidden = false;
  uploadPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

uploadClose.addEventListener('click', () => {
  uploadPanel.hidden = true;
});

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(uploadForm);
  const title = formData.get('title');
  const description = formData.get('description');
  const category = formData.get('category');
  const file = formData.get('file');
  const coverDataUrl = file?.type.startsWith('image/') ? await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  }) : '';
  const submitButton = uploadForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.firstChild.textContent = 'جاري الرفع... ';
  let fileUrl = '';
  let serverProject = null;

  if (useServerStorage) {
    try {
      const response = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description, category, status: formData.get('status'), fileName: file?.name || '', coverDataUrl }) });
      if (response.ok) serverProject = await response.json();
    } catch { /* fall back to local browser storage */ }
  }

  if (remoteClient && file?.name) {
    const filePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
    const { error: uploadError } = await remoteClient.storage.from(remoteConfig.bucket).upload(filePath, file);
    if (uploadError) {
      submitButton.disabled = false;
      submitButton.firstChild.textContent = 'إضافة إلى المعرض ';
      alert('تعذر رفع الملف. تأكد من إعداد Supabase والصلاحيات.');
      return;
    }
    const { data: publicFile } = remoteClient.storage.from(remoteConfig.bucket).getPublicUrl(filePath);
    fileUrl = publicFile.publicUrl;
  }

  if (remoteClient) {
    const { error: projectError } = await remoteClient.from('projects').insert({
      title, description, category, status: formData.get('status'), file_name: file?.name || null, file_url: fileUrl || null
    });
    if (projectError) {
      submitButton.disabled = false;
      submitButton.firstChild.textContent = 'إضافة إلى المعرض ';
      alert('تم رفع الملف لكن تعذر حفظ بيانات المشروع.');
      return;
    }
  }

  const project = document.createElement('article');
  project.className = 'project-card project-new reveal visible';
  project.dataset.category = category;
  const image = document.createElement('div');
  image.className = 'project-image image-uploaded';
  if (serverProject?.coverUrl) {
    image.style.backgroundImage = `url(${serverProject.coverUrl})`;
  } else if (file && file.type.startsWith('image/')) {
    image.style.backgroundImage = `url(${URL.createObjectURL(file)})`;
  } else image.innerHTML = '<span class="upload-symbol">✦</span>';
  image.insertAdjacentHTML('beforeend', '<span class="image-index">NEW</span>');
  project.innerHTML = `<div class="project-meta"><div><h3>${title}</h3><p>${description} · ${file?.name || 'مشروع رقمي'}</p></div><span class="project-arrow">↗</span></div>`;
  project.prepend(image);
  projectGrid.prepend(project);
  if (!serverProject) {
    const localProjects = JSON.parse(localStorage.getItem('nexa-projects') || '[]');
    localProjects.push({ title, description, category, status: formData.get('status'), fileName: file?.name || '', coverDataUrl });
    localStorage.setItem('nexa-projects', JSON.stringify(localProjects));
  }
  uploadForm.reset();
  submitButton.disabled = false;
  submitButton.firstChild.textContent = 'إضافة إلى المعرض ';
  uploadPanel.hidden = true;
  const activeFilter = document.querySelector('.filter.active').dataset.filter;
  applyFilter(activeFilter);
});

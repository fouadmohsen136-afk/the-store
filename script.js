const filters = document.querySelectorAll('.filter');
const projectGrid = document.querySelector('.project-grid');

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

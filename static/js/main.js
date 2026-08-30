// ===== معاينة صورة البروفايل عند اختيارها =====
function initAvatarPreview() {
  const input = document.getElementById("avatarInput");
  const preview = document.getElementById("avatarPreview");
  if (!input || !preview) return;
  input.addEventListener("change", function () {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      preview.innerHTML = `<img src="${e.target.result}" alt="صورة البروفايل">`;
    };
    reader.readAsDataURL(file);
  });
}

// ===== فتح/إغلاق قائمة الموبايل =====
function initMobileMenu() {
  const btn = document.getElementById("hamburgerBtn");
  const panel = document.getElementById("navActions");
  if (!btn || !panel) return;
  btn.addEventListener("click", function () {
    panel.classList.toggle("open");
  });
}

document.addEventListener("DOMContentLoaded", function () {
  initAvatarPreview();
  initMobileMenu();
});

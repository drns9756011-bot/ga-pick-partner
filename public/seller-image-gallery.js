(() => {
  const preview = document.querySelector("#sellerImage");
  const modal = document.querySelector("#quoteImageModal");
  const displayedImage = document.querySelector("#quoteImageModalImg");
  if (!preview || !modal || !displayedImage) return;
  let images = [];
  let index = 0;
  const navigation = document.createElement("div");
  navigation.className = "seller-image-navigation";
  navigation.hidden = true;
  navigation.setAttribute("role", "group");
  navigation.setAttribute("aria-label", "견적서 사진 이동");
  navigation.innerHTML = '<button type="button" data-photo-prev aria-label="이전 사진" title="이전 사진">←</button><span role="status" aria-live="polite"></span><button type="button" data-photo-next aria-label="다음 사진" title="다음 사진">→</button><a target="_blank" rel="noopener noreferrer">원본 열기</a>';
  modal.append(navigation);
  const previous = navigation.querySelector("[data-photo-prev]");
  const next = navigation.querySelector("[data-photo-next]");
  const count = navigation.querySelector("span");
  const original = navigation.querySelector("a");

  function update() {
    navigation.hidden = images.length === 0;
    previous.hidden = next.hidden = images.length < 2;
    previous.disabled = index === 0;
    next.disabled = index === images.length - 1;
    count.textContent = `${index + 1} / ${images.length}`;
    original.href = images[index].src;
  }
  function move(delta) {
    const target = index + delta;
    if (modal.hidden || target < 0 || target >= images.length) return;
    index = target;
    openQuoteImageModal(images[index].src, images[index].alt);
    update();
  }
  // Capture thumbnail activation so mouse, touch and keyboard all open the same gallery.
  preview.addEventListener("click", (event) => {
    const image = event.target.closest("img") || event.target.closest(".quote-thumb-button")?.querySelector("img");
    if (!image) return;
    const thumbnails = [...preview.querySelectorAll("img[data-quote-image]")];
    if (!thumbnails.includes(image)) return;
    event.stopImmediatePropagation();
    const request = getSelectedRequest();
    const originals = Array.isArray(request?.images) && request.images.length ? request.images : [request?.image];
    images = thumbnails.map((item, i) => ({
      src: typeof originals[i] === "string" && /^(https?:|data:image\/|\/)/i.test(originals[i]) ? originals[i] : item.src,
      alt: item.alt,
    }));
    index = thumbnails.indexOf(image);
    openQuoteImageModal(images[index].src, images[index].alt);
    update();
  }, true);
  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  document.addEventListener("keydown", (event) => {
    if (modal.hidden || navigation.hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      move(event.key === "ArrowLeft" ? -1 : 1);
    }
  });
  new MutationObserver(() => {
    if (modal.hidden) { images = []; index = 0; navigation.hidden = true; }
  }).observe(modal, { attributes: true, attributeFilter: ["hidden"] });
})();

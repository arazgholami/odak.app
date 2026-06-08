(function () {
    const CLASS_WRAPPER = 'imglib-wrapper';
    const CLASS_HANDLE = 'imglib-handle';
    const boundWrappers = new WeakSet();

    function injectStyles() {
      const style = document.createElement('style');
      style.textContent = `
      .${CLASS_WRAPPER} {
        box-sizing: border-box;
        position: absolute;
        display: inline-block;
        z-index: 10;
        border: 1px dashed transparent;
        margin: 0 !important;
      }

      .${CLASS_WRAPPER} img {
        margin: 0 !important;
      }
  
      .${CLASS_WRAPPER}:hover {
        border-color: #aaa;
      }
  
      .${CLASS_HANDLE} {
        position: absolute;
        width: 10px;
        height: 10px;
        right: 0;
        bottom: 0;
        background: #000;
        cursor: se-resize;
        z-index: 20;
        opacity: 0;
        transition: opacity 0.2s;
      }
  
      .${CLASS_WRAPPER}:hover .${CLASS_HANDLE} {
        opacity: 1;
      }
  
      .imglib-delete {
        position: absolute;
        width: 20px;
        height: 20px;
        right: 0;
        padding-top: 2px;
        top: -10px;
        background: #ff4444;
        border-radius: 50%;
        cursor: pointer;
        z-index: 20;
        opacity: 0;
        transition: opacity 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
        font-weight: bold;
        border: 2px solid white;
      }
  
      .${CLASS_WRAPPER}:hover .${CLASS_HANDLE},
      .${CLASS_WRAPPER}:hover .imglib-delete {
        opacity: 1;
      }
  
      .imglib-dragging {
        user-select: none !important;
      }
      `;
      document.head.appendChild(style);
    }

    function parseNumber(value, fallback) {
      const number = parseFloat(value);
      return Number.isFinite(number) ? number : fallback;
    }

    function persistWrapperLayout(wrapper) {
      wrapper.dataset.odakX = String(Math.round(parseNumber(wrapper.style.left, wrapper.offsetLeft)));
      wrapper.dataset.odakY = String(Math.round(parseNumber(wrapper.style.top, wrapper.offsetTop)));
      wrapper.dataset.odakWidth = String(Math.round(wrapper.offsetWidth));
      wrapper.dataset.odakHeight = String(Math.round(wrapper.offsetHeight));
    }

    function requestDocumentSave() {
      if (typeof window.saveCurrentDocumentContent === 'function') {
        window.saveCurrentDocumentContent();
      }
    }

    function bindDragResize(wrapper) {
        if (boundWrappers.has(wrapper)) return;
        boundWrappers.add(wrapper);

        const handle = wrapper.querySelector(`.${CLASS_HANDLE}`);
        if (!handle) return;
      
        const img = wrapper.querySelector('img');
        const aspectRatio = (img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : 1;
      
        let isDragging = false, isResizing = false;
        let offsetX, offsetY, startX, startY, startWidth, startHeight;
      
        wrapper.addEventListener('mousedown', (e) => {
          if (e.target === handle) {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = wrapper.offsetWidth;
            startHeight = wrapper.offsetHeight;
          } else {
            isDragging = true;
            offsetX = e.clientX - wrapper.offsetLeft;
            offsetY = e.clientY - wrapper.offsetTop;
          }
          document.body.classList.add('imglib-dragging');
          e.preventDefault();
        });
      
        document.addEventListener('mousemove', (e) => {
          if (!document.body.classList.contains('imglib-dragging')) return;
      
          if (isResizing) {
            const dx = e.clientX - startX;
            const newWidth = Math.max(50, startWidth + dx);
            const newHeight = newWidth / aspectRatio;
            wrapper.style.width = newWidth + 'px';
            wrapper.style.height = newHeight + 'px';
            persistWrapperLayout(wrapper);
          }
      
          if (isDragging) {
            wrapper.style.left = (e.clientX - offsetX) + 'px';
            wrapper.style.top = (e.clientY - offsetY) + 'px';
            persistWrapperLayout(wrapper);
          }
        });
      
        document.addEventListener('mouseup', () => {
          const changed = isDragging || isResizing;
          isDragging = false;
          isResizing = false;
          document.body.classList.remove('imglib-dragging');
          if (changed) {
            persistWrapperLayout(wrapper);
            requestDocumentSave();
          }
        });
      }
      
  
    function initDraggableImages(editor) {
      if (!editor) return;

      const images = editor.querySelectorAll('img[data-draggable]');
      images.forEach((img) => {
        if (img.closest(`.${CLASS_WRAPPER}`)) {
            bindDragResize(img.closest(`.${CLASS_WRAPPER}`));
            return;
        }
  
        const wrapper = document.createElement('div');
        wrapper.className = CLASS_WRAPPER;
        wrapper.contentEditable = false;
  
        // Calculate dimensions with aspect ratio
        const naturalWidth = img.naturalWidth || img.width;
        const naturalHeight = img.naturalHeight || img.height;
        const aspectRatio = naturalWidth && naturalHeight ? naturalWidth / naturalHeight : 1;
        const layout = {
          x: parseNumber(img.dataset.odakX, img.offsetLeft),
          y: parseNumber(img.dataset.odakY, img.offsetTop),
          width: parseNumber(img.dataset.odakWidth, img.width || 200),
          height: parseNumber(img.dataset.odakHeight, null)
        };
        if (!layout.height) {
          layout.height = layout.width / aspectRatio;
        }
  
        wrapper.dataset.odakX = String(Math.round(layout.x));
        wrapper.dataset.odakY = String(Math.round(layout.y));
        wrapper.dataset.odakWidth = String(Math.round(layout.width));
        wrapper.dataset.odakHeight = String(Math.round(layout.height));
        wrapper.style.width = layout.width + 'px';
        wrapper.style.height = layout.height + 'px';
        wrapper.style.top = layout.y + 'px';
        wrapper.style.left = layout.x + 'px';
  
        // Clone and style image
        const newImg = img.cloneNode();
        newImg.style.width = '100%';
        newImg.style.height = '100%';
        newImg.style.objectFit = 'contain';
        newImg.draggable = false;
  
        const handle = document.createElement('div');
        handle.className = CLASS_HANDLE;
  
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'imglib-delete';
        deleteBtn.innerHTML = '×';
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          wrapper.remove();
          requestDocumentSave();
        });
  
        wrapper.appendChild(newImg);
        wrapper.appendChild(handle);
        wrapper.appendChild(deleteBtn);
        img.replaceWith(wrapper);
  
        bindDragResize(wrapper);
      });
    }
  
    document.addEventListener('DOMContentLoaded', () => {
      injectStyles();
      initDraggableImages(document.getElementById('editor'));
    });
  
    window.initDraggableImages = initDraggableImages;
  })();

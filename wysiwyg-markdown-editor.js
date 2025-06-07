/**
 * WYSIWYG Markdown Editor
 * v=1.7
 * A lightweight, real-time markdown editor with live rendering and LTR-RTL support
 * Usage: MarkdownEditor.init('your-div-id');
 * Author: Araz Gholami @arazgholami
 * Email: contact@arazgholami.com
 */

class MarkdownEditor {
    constructor(element) {
        this.editor = element;
        this.isProcessing = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.editor.addEventListener('input', (e) => {
            this.handleInput(e);
        });
        this.editor.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
        this.editor.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    handleInput(e) {
        if (this.isProcessing) return;
    
        
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
    
        const range = selection.getRangeAt(0);
        
        
        if (range.startContainer === this.editor || 
            (range.startContainer.nodeType === Node.TEXT_NODE && range.startContainer.parentNode === this.editor)) {
            const div = document.createElement('div');
            div.setAttribute('dir', 'auto');
            
            if (range.startContainer.nodeType === Node.TEXT_NODE) {
                div.appendChild(range.startContainer.cloneNode(true));
                this.editor.removeChild(range.startContainer);
            } else {
                div.innerHTML = '<br>';
            }
            this.editor.appendChild(div);
            this.setCursorAtEnd(div);
            return;
        }
    
        const textContent = range.startContainer.textContent || '';
        const cursorPos = range.startOffset;
    
        this.processMarkdown(textContent, cursorPos, range);
    }

    handleKeyDown(e) {
        if (e.key === 'Backspace') {
            this.handleBackspace(e);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selection = window.getSelection();
            if (selection.rangeCount === 0) return;

            const range = selection.getRangeAt(0);
            const textContent = range.startContainer.textContent || '';
            
            if (textContent.trim() === '---') {
                this.createHorizontalRule(range.startContainer);
                return;
            }

            // Handle Shift+Enter in blockquotes
            if (e.shiftKey) {
                let currentElement = range.startContainer;
                if (currentElement.nodeType === Node.TEXT_NODE) {
                    currentElement = currentElement.parentElement;
                }
                
                if (currentElement.tagName === 'BLOCKQUOTE') {
                    const br = document.createElement('br');
                    if (range.startContainer.nodeType === Node.TEXT_NODE) {
                        const text = range.startContainer.textContent;
                        const beforeText = text.substring(0, range.startOffset);
                        const afterText = text.substring(range.startOffset);
                        
                        // Create new text nodes for before and after text
                        const beforeNode = document.createTextNode(beforeText);
                        const afterNode = document.createTextNode(afterText);
                        
                        // Replace the original text node with our new nodes and br
                        const parent = range.startContainer.parentNode;
                        parent.replaceChild(beforeNode, range.startContainer);
                        parent.insertBefore(br, beforeNode.nextSibling);
                        
                        // Add non-breaking space after br
                        const nbsp = document.createTextNode('\u00A0');
                        parent.insertBefore(nbsp, br.nextSibling);
                        parent.insertBefore(afterNode, nbsp.nextSibling);
                        
                        // Set cursor position after the nbsp
                        range.setStart(afterNode, 0);
                        range.setEnd(afterNode, 0);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    } else {
                        currentElement.appendChild(br);
                        // Add non-breaking space after br
                        const nbsp = document.createTextNode('\u00A0');
                        currentElement.appendChild(nbsp);
                        this.setCursorAfter(nbsp);
                    }
                    return;
                }
            }
            
            let currentElement = range.startContainer;
            if (currentElement.nodeType === Node.TEXT_NODE) {
                currentElement = currentElement.parentElement;
            }
            
            const listItem = currentElement.tagName === 'LI' ? currentElement : 
                           currentElement.parentElement?.tagName === 'LI' ? currentElement.parentElement : null;
            
            if (listItem) {
                if (listItem.textContent.trim() === '' || 
                    (listItem.childNodes.length === 1 && listItem.firstChild.nodeName === 'BR')) {
                    const div = document.createElement('div');
                    div.setAttribute('dir', 'auto');
                    div.innerHTML = '<br>';
                    
                    const list = listItem.parentNode;
                    list.removeChild(listItem);
                    
                    if (list.children.length === 0) {
                        list.parentNode.removeChild(list);
                    }
                    
                    if (list.nextSibling) {
                        list.parentNode.insertBefore(div, list.nextSibling);
                    } else {
                        list.parentNode.appendChild(div);
                    }
                    
                    this.setCursorAtEnd(div);
                    return;
                }

                const newLi = document.createElement('li');
                newLi.setAttribute('dir', 'auto');
                newLi.innerHTML = '<br>';
                
                const list = listItem.parentNode;
                if (listItem.nextSibling) {
                    list.insertBefore(newLi, listItem.nextSibling);
                } else {
                    list.appendChild(newLi);
                }
                
                this.setCursorAtEnd(newLi);
                return;
            }

            
            const div = document.createElement('div');
            div.setAttribute('dir', 'auto');
            div.innerHTML = '<br>';
            
            let container = range.startContainer;
            while (container && container !== this.editor && container.parentNode !== this.editor) {
                container = container.parentNode;
            }
            
            if (container === this.editor) {
                
                this.editor.appendChild(div);
            } else if (container && container.parentNode === this.editor) {
                
                if (container.nextSibling) {
                    this.editor.insertBefore(div, container.nextSibling);
                } else {
                    this.editor.appendChild(div);
                }
            } else {
                
                this.editor.appendChild(div);
            }
            
            this.setCursorAtEnd(div);
        }
    }

    handleKeyUp(e) {
        if (e.key === 'ArrowRight') {
            this.handleArrowRight();
        }
    }

    processMarkdown(text, cursorPos, range) {
        this.isProcessing = true;

        const patterns = [
            { regex: /`([^`]+)`/, handler: (match) => this.createInlineCode(text, match, range.startContainer), minPos: (match) => text.indexOf(match[0]) + match[0].length },
            { regex: /^-\s\[x\]\s(.*)/, handler: (match) => this.createCheckbox(match[1], range.startContainer, true), minPos: 6 },
            { regex: /^-\s\[\s?\]\s(.*)/, handler: (match) => this.createCheckbox(match[1], range.startContainer, false), minPos: 5 },
            { regex: /^(#{1,6})\s(.*)$/, handler: (match) => this.replaceWithElement(`h${match[1].length}`, match[2], range.startContainer), minPos: (match) => match[1].length + 1 },
            { regex: /^>\s(.+)$/, handler: (match) => this.createBlockquote(match[1], range.startContainer), minPos: 2 },
            { regex: /^---\s*$/, handler: (match) => this.createHorizontalRule(range.startContainer), minPos: 3 },
            { regex: /!\[([^\]]*)\]\(([^)]+)\)/, handler: (match) => this.createImage(match[1], match[2], text, range.startContainer), minPos: (match) => text.indexOf(match[0]) + match[0].length },
            { regex: /\[([^\]]+)\]\(([^)]+)\)/, handler: (match) => this.createLink(match[1], match[2], text, range.startContainer), minPos: (match) => text.indexOf(match[0]) + match[0].length },
            { regex: /\*\*(.*?)\*\*/, handler: (match) => this.replaceInlineMarkdown(text, match, 'strong', range.startContainer), minPos: (match) => text.indexOf(match[0]) + match[0].length },
            { regex: /(?<!\*)\*([^*]+)\*(?!\*)/, handler: (match) => this.replaceInlineMarkdown(text, match, 'em', range.startContainer), minPos: (match) => text.indexOf(match[0]) + match[0].length },
            { regex: /__(.+?)__/, handler: (match) => this.replaceInlineMarkdown(text, match, 'u', range.startContainer), minPos: (match) => text.indexOf(match[0]) + match[0].length },
            { regex: /^(\d+)\.\s(.+)$/, handler: (match) => this.createOrderedListItem(match[2], range.startContainer), minPos: (match) => match[1].length + 2 },
            { regex: /^-\s(?!\[)(.+)$/, handler: (match) => this.createListItem(match[1], range.startContainer), minPos: 2 }
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern.regex);
            if (match) {
                const minPos = typeof pattern.minPos === 'function' ? pattern.minPos(match) : pattern.minPos;
                if (cursorPos > minPos) {
                    pattern.handler(match);
                    this.isProcessing = false;
                    return;
                }
            }
        }

        this.isProcessing = false;
    }

    replaceWithElement(tagName, content, textNode) {
        const element = document.createElement(tagName);
        element.textContent = content;

        const parent = textNode.parentNode;
        parent.replaceChild(element, textNode);

        this.setCursorAtEnd(element);
    }

    createBlockquote(content, textNode) {
        const blockquote = document.createElement('blockquote');
        blockquote.setAttribute('dir', 'auto');
        blockquote.textContent = content;

        const parent = textNode.parentNode;
        parent.replaceChild(blockquote, textNode);

        this.setCursorAtEnd(blockquote);
    }

    createInlineCode(text, match, textNode) {
        console.log(text, match, textNode);
        const code = document.createElement('code');
        code.setAttribute('dir', 'auto');
        code.textContent = match[1];

        this.insertElementWithText(code, text, match[0], textNode);
    }

    replaceInlineMarkdown(text, match, tagName, textNode) {
        const element = document.createElement(tagName);
        element.setAttribute('dir', 'auto');
        element.textContent = match[1];

        this.insertElementWithText(element, text, match[0], textNode);
    }

    insertElementWithText(element, text, matchText, textNode) {
        const beforeText = text.substring(0, text.indexOf(matchText));
        const afterText = text.substring(text.indexOf(matchText) + matchText.length);

        const parent = textNode.parentNode;

        if (beforeText) {
            const beforeNode = document.createTextNode(beforeText);
            parent.insertBefore(beforeNode, textNode);
        }

        parent.insertBefore(element, textNode);

        if (afterText) {
            const afterNode = document.createTextNode(afterText);
            parent.insertBefore(afterNode, textNode);
        }

        parent.removeChild(textNode);
        this.setCursorAfter(element);
    }

    
    createListItem(content, textNode) {
        const li = document.createElement('li');
        li.setAttribute('dir', 'auto');
        li.textContent = content;

        const parent = textNode.parentNode;
        
        let ul = null;
        
        
        if (parent.previousElementSibling && parent.previousElementSibling.tagName === 'UL') {
            ul = parent.previousElementSibling;
        }
        
        
        if (!ul) {
            ul = document.createElement('ul');
            ul.setAttribute('dir', 'auto');
            parent.parentNode.insertBefore(ul, parent);
        }

        ul.appendChild(li);
        parent.parentNode.removeChild(parent);

        this.setCursorAtEnd(li);
    }

    
    createOrderedListItem(content, textNode) {
        const li = document.createElement('li');
        li.setAttribute('dir', 'auto');
        li.textContent = content;

        const parent = textNode.parentNode;
        let ol = null;
        
        if (parent.previousElementSibling && parent.previousElementSibling.tagName === 'OL') {
            ol = parent.previousElementSibling;
        }
        
        if (!ol) {
            ol = document.createElement('ol');
            ol.setAttribute('dir', 'auto');
            parent.parentNode.insertBefore(ol, parent);
        }

        ol.appendChild(li);
        parent.parentNode.removeChild(parent);

        this.setCursorAtEnd(li);
    }

createCheckbox(content, textNode, checked = false) {
    const checkbox = document.createElement('input');
    checkbox.setAttribute('dir', 'auto');
    checkbox.type = 'checkbox';
    if (checked) {
        checkbox.setAttribute('checked', '');
        checkbox.checked = checked;
    }

    const textSpan = document.createElement('span');
    textSpan.setAttribute('dir', 'auto');
    textSpan.textContent = ' ' + content;

    const parent = textNode.parentNode;
    
    // Insert checkbox and text span directly
    parent.insertBefore(checkbox, textNode);
    parent.insertBefore(textSpan, textNode);
    parent.removeChild(textNode);

    this.setCursorAfter(textSpan);
}

    createLink(text, url, fullText, textNode) {
        const link = document.createElement('a');
        link.href = url;
        link.textContent = text;
        link.target = '_blank';

        const match = fullText.match(/\[([^\]]+)\]\(([^)]+)\)/);
        this.insertElementWithText(link, fullText, match[0], textNode);
    }

    createImage(alt, src, fullText, textNode) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = alt;
        img.setAttribute('data-draggable', '');

        const match = fullText.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        this.insertElementWithText(img, fullText, match[0], textNode);
        initDraggableImages(editor);
    }

    createHorizontalRule(textNode) {
        const hr = document.createElement('hr');
        
        const parent = textNode.parentNode;
        parent.replaceChild(hr, textNode);
        
        const div = document.createElement('div');
        div.setAttribute('dir', 'auto');
        div.innerHTML = '<br>';
        parent.insertBefore(div, hr.nextSibling);
        
        this.setCursorAtEnd(div);
    }

    handleBackspace(e) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);

        if (range.startContainer.nodeType === Node.TEXT_NODE) {
            const element = range.startContainer.parentElement;
            const textContent = range.startContainer.textContent;
            if (range.startOffset === textContent.length && this.isStyledElement(element)) {
                e.preventDefault();
                this.convertToMarkdown(element);
                return;
            }
        } else if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
            const element = range.startContainer;
            if (this.isStyledElement(element)) {
                const textNode = element.firstChild;
                if (textNode && textNode.nodeType === Node.TEXT_NODE && range.startOffset === textNode.textContent.length) {
                    e.preventDefault();
                    this.convertToMarkdown(element);
                    return;
                }
            }

            const prevElement = range.startContainer.childNodes[range.startOffset - 1];
            if (prevElement && this.isStyledElement(prevElement)) {
                e.preventDefault();
                this.convertToMarkdown(prevElement);
                return;
            }
        }
    }

    handleArrowRight() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const element = range.startContainer.parentElement;

        if (this.isStyledElement(element) && range.startOffset === range.startContainer.textContent.length) {
            this.setCursorAfter(element);
        }
    }

    isStyledElement(element) {
        return ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'STRONG', 'EM', 'U', 'CODE', 'LI', 'BLOCKQUOTE', 'A', 'IMG', 'HR'].includes(element.tagName);
    }

    convertToMarkdown(element) {
        const text = element.textContent;
        let markdown = '';

        switch (element.tagName) {
            case 'H1': markdown = `# ${text}`; break;
            case 'H2': markdown = `## ${text}`; break;
            case 'H3': markdown = `### ${text}`; break;
            case 'H4': markdown = `#### ${text}`; break;
            case 'H5': markdown = `##### ${text}`; break;
            case 'H6': markdown = `###### ${text}`; break;
            case 'STRONG': markdown = `**${text}**`; break;
            case 'EM': markdown = `*${text}*`; break;
            case 'U': markdown = `__${text}__`; break;
            case 'CODE': markdown = `\`${text}\``; break;
            case 'BLOCKQUOTE': markdown = `> ${text}`; break;
            case 'A': markdown = `[${text}](${element.href})`; break;
            case 'IMG': markdown = `![${element.alt}](${element.src})`; break;
            case 'HR': markdown = `---`; break;
            case 'LI':
                const parentList = element.parentElement;
                const parentTag = parentList.tagName;
                if (parentTag === 'OL') {
                    markdown = `1. ${text}`;
                } else {
                    markdown = `- ${text}`;
                }
                
                
                const div = document.createElement('div');
                div.setAttribute('dir', 'auto');
                const textNode = document.createTextNode(markdown);
                div.appendChild(textNode);
                
                
                if (parentList.nextSibling) {
                    parentList.parentNode.insertBefore(div, parentList.nextSibling);
                } else {
                    parentList.parentNode.appendChild(div);
                }
                
                
                parentList.removeChild(element);
                
                
                if (parentList.children.length === 0) {
                    parentList.parentNode.removeChild(parentList);
                }
                
                this.setCursorAtEnd(textNode);
                return; 
        }

        const textNode = document.createTextNode(markdown);
        element.parentNode.replaceChild(textNode, element);

        this.setCursorAtEnd(textNode);
    }

    setCursorAtEnd(element) {
        const range = document.createRange();
        const selection = window.getSelection();

        if (element.nodeType === Node.TEXT_NODE) {
            range.setStart(element, element.textContent.length);
        } else {
            range.selectNodeContents(element);
            range.collapse(false);
        }

        selection.removeAllRanges();
        selection.addRange(range);
    }

    setCursorAfter(element) {
        const range = document.createRange();
        const selection = window.getSelection();

        range.setStartAfter(element);
        range.collapse(true);

        selection.removeAllRanges();
        selection.addRange(range);
    }

    static init(elementId, options = {}) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Element with id "${elementId}" not found`);
            return null;
        }

        element.setAttribute('contenteditable', 'true');
        element.setAttribute('spellcheck', 'false');
        element.setAttribute('dir', 'auto');
        
        if (options.placeholder) {
            element.setAttribute('placeholder', options.placeholder);
        }

        if (options.autofocus !== false) {
            element.focus();
        }

        return new MarkdownEditor(element);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const autoElements = document.querySelectorAll('[data-markdown-editor]');
    autoElements.forEach(element => {
        const options = {
            placeholder: element.getAttribute('placeholder'),
            autofocus: element.getAttribute('data-autofocus') !== 'false'
        };
        MarkdownEditor.init(element.id, options);
    });
});

window.MarkdownEditor = MarkdownEditor;

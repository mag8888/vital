// ПОЛНОЕ ОТКЛЮЧЕНИЕ всех редиректов в AdminJS
console.log('🚫 NO REDIRECT AdminJS Blocker Loading...');

(function() {
  'use strict';
  
  // Переопределяем все методы редиректа
  const originalRedirect = window.location.redirect;
  const originalAssign = window.location.assign;
  const originalReplace = window.location.replace;
  const originalReload = window.location.reload;
  
  // Блокируем все методы редиректа
  window.location.redirect = function() {
    console.log('🚫 BLOCKED redirect');
    return false;
  };
  
  window.location.assign = function() {
    console.log('🚫 BLOCKED assign');
    return false;
  };
  
  window.location.replace = function() {
    console.log('🚫 BLOCKED replace');
    return false;
  };
  
  window.location.reload = function() {
    console.log('🚫 BLOCKED reload');
    return false;
  };
  
  // Блокируем все методы history
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  const originalGo = history.go;
  const originalBack = history.back;
  const originalForward = history.forward;
  
  history.pushState = function() {
    console.log('🚫 BLOCKED pushState');
    return false;
  };
  
  history.replaceState = function() {
    console.log('🚫 BLOCKED replaceState');
    return false;
  };
  
  history.go = function() {
    console.log('🚫 BLOCKED go');
    return false;
  };
  
  history.back = function() {
    console.log('🚫 BLOCKED back');
    return false;
  };
  
  history.forward = function() {
    console.log('🚫 BLOCKED forward');
    return false;
  };
  
  // Блокируем все события навигации
  window.addEventListener('beforeunload', function(e) {
    console.log('🚫 BLOCKED beforeunload');
    e.preventDefault();
    e.returnValue = '';
    return '';
  });
  
  window.addEventListener('popstate', function(e) {
    console.log('🚫 BLOCKED popstate');
    e.preventDefault();
    e.stopPropagation();
    return false;
  });
  
  // Блокируем все клики на ссылки
  document.addEventListener('click', function(e) {
    const target = e.target;
    const button = target.closest('button');
    
    // Разрешаем кнопки действий AdminJS
    if (target.classList.contains('adminjs-button') || 
        target.closest('.adminjs-button')) {
      return true;
    }
    
    // Разрешаем кнопки с кастомными onclick функциями (импорт, модальные окна)
    if (button && button.hasAttribute('onclick')) {
      return true;
    }
    
    // Блокируем все ссылки
    if (target.tagName === 'A' || target.closest('a')) {
      console.log('🚫 BLOCKED LINK CLICK:', target.href || target.closest('a').href);
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
    
    // Блокируем все клики по строкам таблицы
    if (target.closest('.adminjs-table tbody tr')) {
      console.log('🚫 BLOCKED TABLE ROW CLICK');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  }, true);
  
  // Блокируем все формы
  document.addEventListener('submit', function(e) {
    console.log('🚫 BLOCKED FORM SUBMIT');
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  }, true);
  
  // Блокируем все изменения URL
  const originalHref = window.location.href;
  Object.defineProperty(window.location, 'href', {
    get: function() {
      return originalHref;
    },
    set: function(value) {
      console.log('🚫 BLOCKED href change:', value);
      return false;
    }
  });
  
  console.log('🚫 NO REDIRECT AdminJS Blocker Loaded!');
})();

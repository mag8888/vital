// Отключение автоматического перехода на детальную страницу
document.addEventListener('DOMContentLoaded', function() {
  // Убираем обработчики клика со строк таблицы
  const tableRows = document.querySelectorAll('.adminjs-table tbody tr');
  tableRows.forEach(row => {
    // Убираем все обработчики событий
    row.onclick = null;
    row.style.cursor = 'default';
    
    // Убираем обработчики с ячеек
    const cells = row.querySelectorAll('td');
    cells.forEach(cell => {
      cell.onclick = null;
      cell.style.cursor = 'default';
    });
  });
  
  // Добавляем обработчики только для кнопок действий
  const actionButtons = document.querySelectorAll('.adminjs-button');
  actionButtons.forEach(button => {
    button.style.cursor = 'pointer';
  });
  
  // Отключаем переход по клику на строку
  document.addEventListener('click', function(e) {
    const target = e.target;
    const row = target.closest('.adminjs-table tbody tr');
    
    if (row && !target.closest('.adminjs-button')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  });
  
  // Улучшаем навигацию
  const navigationItems = document.querySelectorAll('.adminjs-navigation-item');
  navigationItems.forEach(item => {
    item.addEventListener('click', function(e) {
      // Добавляем анимацию перехода
      this.style.transform = 'translateX(5px)';
      setTimeout(() => {
        this.style.transform = 'translateX(0)';
      }, 200);
    });
  });
  
  // Добавляем индикаторы загрузки
  const forms = document.querySelectorAll('.adminjs-form');
  forms.forEach(form => {
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.addEventListener('click', function() {
        this.innerHTML = '<span class="spinner"></span> Сохранение...';
        this.disabled = true;
      });
    }
  });
  
  // Улучшаем UX для фильтров
  const filterInputs = document.querySelectorAll('.adminjs-filter input, .adminjs-filter select');
  filterInputs.forEach(input => {
    input.addEventListener('focus', function() {
      this.parentElement.style.borderColor = '#007bff';
      this.parentElement.style.boxShadow = '0 0 0 0.2rem rgba(0, 123, 255, 0.25)';
    });
    
    input.addEventListener('blur', function() {
      this.parentElement.style.borderColor = '#dee2e6';
      this.parentElement.style.boxShadow = 'none';
    });
  });
  
  // Добавляем анимации для карточек
  const cards = document.querySelectorAll('.adminjs-card');
  cards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-2px)';
      this.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    });
  });
  
  // Улучшаем отображение таблиц
  const tables = document.querySelectorAll('.adminjs-table');
  tables.forEach(table => {
    // Добавляем полосы зебры
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach((row, index) => {
      if (index % 2 === 0) {
        row.style.backgroundColor = '#f8f9fa';
      }
    });
  });
  
  // Добавляем уведомления об успешных действиях
  const successMessages = document.querySelectorAll('.adminjs-alert--success');
  successMessages.forEach(message => {
    message.style.animation = 'fadeIn 0.5s ease';
  });
  
  // Улучшаем мобильную навигацию
  if (window.innerWidth <= 768) {
    const navigation = document.querySelector('.adminjs-navigation');
    if (navigation) {
      navigation.style.flexDirection = 'column';
      navigation.style.padding = '10px';
    }
  }
});

// Функция для обновления таблицы без перезагрузки
function refreshTable() {
  const table = document.querySelector('.adminjs-table');
  if (table) {
    table.style.opacity = '0.5';
    setTimeout(() => {
      location.reload();
    }, 300);
  }
}

// Функция для показа уведомлений
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `adminjs-notification adminjs-notification--${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
    color: white;
    padding: 15px 20px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    animation: fadeIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// CSS анимации
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-20px); }
  }
  
  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid #ffffff;
    border-radius: 50%;
    border-top-color: transparent;
    animation: spin 1s ease-in-out infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

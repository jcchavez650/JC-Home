// Delete confirmation modal
function confirmDelete(id, palletId) {
  document.getElementById('deletePalletId').textContent = palletId;
  document.getElementById('deleteForm').action = '/delete/' + id;
  const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
  modal.show();
}

// Auto-uppercase location and pallet_id inputs
document.addEventListener('DOMContentLoaded', function () {
  ['pallet_id', 'location'].forEach(function (name) {
    const el = document.querySelector('[name="' + name + '"]');
    if (el) {
      el.addEventListener('input', function () {
        const pos = this.selectionStart;
        this.value = this.value.toUpperCase();
        this.setSelectionRange(pos, pos);
      });
    }
  });
});

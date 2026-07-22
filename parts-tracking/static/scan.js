// Counter station: drive the scan-driven check-out / check-in flow.
//
// A keyboard-wedge scanner "types" a code and presses Enter. We listen for
// Enter on each input to advance the flow. Everything also works by typing
// the code by hand and pressing Enter, so no scanner is required to test.

(function () {
  const partInput = document.getElementById("part-input");
  const partDetails = document.getElementById("part-details");
  const qtyInput = document.getElementById("qty-input");
  const workerInput = document.getElementById("worker-input");
  const workerName = document.getElementById("worker-name");
  const approverInput = document.getElementById("approver-input");
  const approverName = document.getElementById("approver-name");
  const submitBtn = document.getElementById("submit-btn");
  const resetBtn = document.getElementById("reset-btn");
  const result = document.getElementById("result");

  let currentPart = null;

  function onEnter(el, handler) {
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        handler(el.value.trim());
      }
    });
  }

  function showResult(message, ok) {
    result.textContent = message;
    result.className = "result " + (ok ? "ok" : "err");
  }

  async function lookupPart(partNumber) {
    if (!partNumber) return;
    try {
      const resp = await fetch("/api/part/" + encodeURIComponent(partNumber));
      const data = await resp.json();
      if (!data.ok) {
        currentPart = null;
        partDetails.className = "details";
        partDetails.innerHTML = '<span style="color:var(--err)">' + data.error + "</span>";
        return;
      }
      currentPart = data.part;
      partDetails.className = "details";
      partDetails.innerHTML =
        "<strong>" + currentPart.name + "</strong> · " +
        "Location: " + (currentPart.location || "—") + " · " +
        "On hand: <strong>" + currentPart.qty_on_hand + "</strong>";
      qtyInput.focus();
      qtyInput.select();
    } catch (err) {
      showResult("Could not reach the server.", false);
    }
  }

  onEnter(partInput, lookupPart);

  // Typing/scanning the part then Enter also moves on; blur re-checks too.
  partInput.addEventListener("blur", function () {
    if (partInput.value.trim() && !currentPart) lookupPart(partInput.value.trim());
  });

  onEnter(qtyInput, function () { workerInput.focus(); });

  onEnter(workerInput, function (badge) {
    workerName.textContent = badge ? "Worker: " + badge : "";
    workerName.className = "badge-name";
    approverInput.focus();
  });

  onEnter(approverInput, function (badge) {
    approverName.textContent = badge ? "Approver: " + badge : "";
    approverName.className = "badge-name";
    submit();
  });

  async function submit() {
    const direction = document.querySelector('input[name="direction"]:checked').value;
    const payload = {
      part_number: partInput.value.trim(),
      quantity: parseInt(qtyInput.value, 10) || 0,
      direction: direction,
      worker_badge: workerInput.value.trim(),
      approver_badge: approverInput.value.trim(),
    };
    try {
      const resp = await fetch("/api/movement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (data.ok) {
        showResult(data.message, true);
        resetForm();
      } else {
        showResult(data.error, false);
      }
    } catch (err) {
      showResult("Could not reach the server.", false);
    }
  }

  function resetForm() {
    currentPart = null;
    partInput.value = "";
    qtyInput.value = "1";
    workerInput.value = "";
    approverInput.value = "";
    workerName.textContent = "";
    approverName.textContent = "";
    partDetails.className = "details hidden";
    partDetails.innerHTML = "";
    partInput.focus();
  }

  submitBtn.addEventListener("click", submit);
  resetBtn.addEventListener("click", function () {
    resetForm();
    result.className = "result hidden";
  });

  partInput.focus();
})();

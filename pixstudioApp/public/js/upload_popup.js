var idContainer = document.getElementById("id");

function init() {
  var url_string = window.location.href;
  var url = new URL(url_string);
  var id = url.searchParams.get("id");
  idContainer.innerHTML = id;
}

init();

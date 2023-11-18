const accessKey = "40445380-137e705552466a8e70ee8b23f"; // Pixabay API Key

const formEl = document.querySelector("form");
const inputEl = document.getElementById("search-input");
const searchResults = document.querySelector(".search-results");
const showMore = document.getElementById("show-more-button");

let inputData = "";
let page = 1;

export async function searchImages() {
  inputData = inputEl.value;
  const url = `https://pixabay.com/api/?key=${accessKey}&page=${page}&q=${inputData}`;

  const response = await fetch(url);
  const data = await response.json();

  const results = data.hits; // Pixabay에서는 "hits" 배열 안에 이미지 결과가 있습니다.

  if (page === 1) {
    searchResults.innerHTML = "";
  }

  results.map((result) => {
    const imageWrapper = document.createElement("div");
    imageWrapper.classList.add("search-result");
    const image = document.createElement("img");
    image.src = result.webformatURL; // Pixabay에서는 "previewURL"을 사용하여 미리 보기 이미지를 가져옵니다.
    image.alt = result.tags; // Alt 텍스트 설정

    const imageLink = document.createElement("a");
    imageLink.href = result.pageURL; // 이미지 페이지로 연결
    imageLink.target = "_blank";
    imageLink.textContent = result.tags;
    imageWrapper.appendChild(image);
    imageWrapper.appendChild(imageLink);
    searchResults.appendChild(imageWrapper);
  });

  if (results.length > 0) {
    page++; // 페이지 번호 증가
    showMore.style.display = "block"; // "더 보기" 버튼 표시
  } else {
    showMore.style.display = "none"; // 결과가 더 이상 없을 때 "더 보기" 버튼 숨김
  }
}

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  page = 1;
  searchImages();
});

showMore.addEventListener("click", () => {
  searchImages();
});

// Add a click event handler to the parent container of the Pixabay images
searchResults.addEventListener('click', function (event) {
  if (event.target.tagName === 'IMG') {
      var imageUrl = event.target.getAttribute('src');
      // Load the clicked image into the TUI Image Editor
      imageEditor.addImageObject(imageUrl, 'new_image_name');
  }
  var searchContainer = document.getElementById('tui-image-editor-search-container');
  if (searchContainer) {
    searchContainer.style.display = 'none';
  }
});
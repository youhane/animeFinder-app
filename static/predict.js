var imgSrc;
let imageLoaded = false;
$("#image-selector").change(function () {
	imageLoaded = false;
	let reader = new FileReader();
	reader.onload = function () {
		imgSrc = reader.result;
		$(".selected-image").attr("src", imgSrc);
		$("#prediction-list").empty();
		imageLoaded = true;
	}
	
	let file = $("#image-selector").prop('files')[0];
	reader.readAsDataURL(file);
	$("#anime-title").text(" ");
	$("#same-chara").empty();
});

$("#url-selector").change(function () {
	let dataURL = $("#url-selector").val()
	imageLoaded = false;
	$(".selected-image").attr("src", dataURL);
	imageLoaded = true;	
	$("#anime-title").text(" ");
});

let model;
let modelLoaded = false;
$( document ).ready(async function () {
	modelLoaded = false;
	$('.progress-bar').show();
    console.log( "Loading model..." );
    model = await tf.loadGraphModel('model/model.json');
    console.log( "Model loaded." );
	$('.progress-bar').hide();
	modelLoaded = true;
});


// API JIKAN
const BASE_URL = 'https://api.jikan.moe/v4/'
var similarChara

$("#predict-button").click(async function () {
	if (!modelLoaded) { alert("The model must be loaded first"); return; }
	if (!imageLoaded) { alert("Please select an image first"); return; }

	$("#same-chara").empty();
	$("#morechara").removeClass("d-none");
	$(".selected-image-res").attr("src", imgSrc);
	
	// betak imagenya
	let image = $('.selected-image').get(0);
	
	// Pre-process the image
	console.log( "Loading image..." );
	let tensor = tf.browser.fromPixels(image, 3)
	.resizeNearestNeighbor([96,96])
		.expandDims(0)
		.div(tf.scalar(255.0))
	let predictions = await model.predict(tensor).data();
	// console.log(predictions);
	let top5 = Array.from(predictions)
		.map(function (p, i) { // this is Array.map
			return {
				probability: p*10,
				className: TARGET_CLASSES[i], // we are selecting the value from the obj
				animeName: ANIME_LIST[i]
			};
		}).sort(function (a, b) {
			return b.probability - a.probability;
		}).slice(0, 5);

	$("#prediction-list").empty();
	top5.forEach(function (p) {
		$("#prediction-list").append(`<li>${p.className} - ${p.animeName}: ${p.probability.toFixed(2)} %</li>`);
	});

	$("#chara-name").text(`${top5[0].className} (${top5[0].probability.toFixed(2)} %)`);

	const inputAnimeName = top5[0].animeName
	similarChara = [top5[0].className, top5[1].className, top5[2].className, top5[3].className]

	let search = 'anime?q=' + inputAnimeName

	$.get(`${BASE_URL}${search}`, (res) => {
		// Get Title
		$("#anime-title").text(`${res.data[0].title}`);
        $("#poster").attr("src", res.data[0].images.jpg.image_url);
		animeId = res.data[0].mal_id

		// Get chara id
		$.get(`${BASE_URL}characters?q=${similarChara[0]}`, (res) => {
			let charaId = res.data[0].mal_id
			$.get(`${BASE_URL}characters/${charaId}/pictures`, (res) => {
				for (let index = 1; index <= 4; index++) {
					$("#same-chara").append(`<img src="${res.data[index].jpg.image_url}" width="70" />`)
				}
			})
		})
	})
});

$('#morechara').click(() => {
	$("#similar-chara").empty()
	// Get other similar chara id
	// CharaNumber
	let charaNumber = Math.floor(Math.random()*similarChara.length)
	charaNumber = charaNumber === 0 ? charaNumber+1 : charaNumber

	$.get(`${BASE_URL}characters?q=${similarChara[charaNumber]}`, (res) => {
		let charaId = res.data[0].mal_id
		$.get(`${BASE_URL}characters/${charaId}/pictures`, (res) => {
			$("#similar-chara").append(`<img src="${res.data[0].jpg.image_url}" /><p>${similarChara[charaNumber]}</p>`)
		})
	})
})
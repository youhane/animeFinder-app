let imageLoaded = false;
$("#image-selector").change(function () {
	imageLoaded = false;
	let reader = new FileReader();
	reader.onload = function () {
		let dataURL = reader.result;
		$(".selected-image").attr("src", dataURL);
		$("#prediction-list").empty();
		imageLoaded = true;
	}
	
	let file = $("#image-selector").prop('files')[0];
	reader.readAsDataURL(file);
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

$("#predict-button").click(async function () {
	if (!modelLoaded) { alert("The model must be loaded first"); return; }
	if (!imageLoaded) { alert("Please select an image first"); return; }
	
	let image = $('.selected-image').get(0);
	
	// Pre-process the image
	console.log( "Loading image..." );
	let tensor = tf.browser.fromPixels(image, 3)
	.resizeNearestNeighbor([96,96])
		.expandDims(0)
		.div(tf.scalar(255.0))
	let predictions = await model.predict(tensor).data();
	console.log(predictions);
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

	const inputAnimeName = top5[0].animeName
	console.log(inputAnimeName)

	// API JIKAN
	const BASE_URL = 'https://api.jikan.moe/v4/'
	let search = 'anime?q=' + inputAnimeName
	let animeId;

	$.ajax({
		url: BASE_URL + search,
		type: 'get',
		dataType: 'json',
		success: (result) => {
			$("#anime-title").text(`${result.data[0].title}`);
			console.log(result.data[0].mal_id)
			animeId = result.data[0].mal_id
			console.log(animeId)
			console.log(result.data)
			$.ajax({
				url: BASE_URL + 'anime/' + animeId + '/pictures',
				type: 'get',
				dataType: 'json',
				success: (result) => {
					console.log(result)
					$("#poster").attr("src", result.data[0].jpg.image_url);
					console.log(result.data)
				},
				error : () => {
					$("#anime-title").text(`Dunno`);
				}
			})
		},
		error : () => {
			$("#anime-title").text(`Dunno`);
		}
	})
});

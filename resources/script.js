if(chrome.tabs){
    chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
        const parsedURL = new URL(tabs[0].url)
        const url = parsedURL.protocol + '//' + parsedURL.hostname + parsedURL.pathname
        $('#url').text(url).attr('title', url)
    });
}

$('.nav-item').on('click', function () {
    $('.nav-item.active').removeClass('active')
    $(this).addClass('active')
    const key = $(this).data('key')
    $('#nav-content .nav-content.active').removeClass('active')
    $(`#nav-content .nav-content#${key}`).addClass('active')
})

$('.intro-container #intro-options h2').on('click', function(){
    const key = $(this).data('key')
    $('.intro').fadeOut(function(){
        $(`.intro-option#${key}`).fadeIn(); 
    })
})

$('.intro-option-back').on('click', function(){
    $(".intro-option:visible").fadeOut(function(){
        $('.intro').fadeIn()
    })
})
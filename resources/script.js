const endpointURL = "http://localhost:8080/api/"

if (!chrome.storage) {
  chrome.storage = {
    sync: {
      get: (e, f) => { f({ jwtToken: '' }) },
      set: (e, f) => { f() }
    }
  }
}

let jwtToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhYWFhIiwiaXNzIjoiR3Jvb292eSIsImV4cCI6MTY1NzQ0MjA3NH0.PWj713JXouUPnd98iIwra43uWQnYUr0GywRTy755FYg";

chrome.storage.sync.get(['jwtToken', 'username'], function (result) {
  if (result.jwtToken) {
    const now = Date.now()
    const expiry = jwt_decode(result.jwtToken).exp * 1000;
    if (expiry > now) {
      console.log('RESULT', result)
      console.log(`jwt token still valid for ${(expiry - now) / 1000 / 60} minutes`)
      $('.intro-container').hide()
      jwtToken = result.jwtToken;
      initHomepage(result.username, result.jwtToken)
    } else {
      console.log(`jwt token expired ${(now - expiry) / 1000 / 60} minutes ago`)
    }
  }
});

const skipIntroForDev = true;
if (skipIntroForDev) {
  $(".intro-container").hide();
}


$(".nav-item, .page-director").on("click", function () {
  if ($(this).hasClass("nav-item")) {
    $(".nav-item.active").removeClass("active");
    $(this).addClass("active");
  }
  const key = $(this).data("key");
  $("#nav-content .nav-content.active").removeClass("active");
  $(`#nav-content .nav-content#${key}`).addClass("active");
});

$(".intro-container #intro-options h2").on("click", function () {
  const key = $(this).data("key");
  $(".intro").fadeOut(function () {
    $(`.intro-option#${key}`).fadeIn();
  });
});

$(".intro-option-back").on("click", function () {
  $(".intro-option:visible").fadeOut(function () {
    $(".intro").fadeIn();
    $('.intro-option .error-label').text('')
  });
});

const loginForm = {
  username: $("#login-username"),
  password: $("#login-password"),
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

$("#login-button").on("click", function () {
  const username = loginForm.username.val();
  let shouldHideUsernameError = true;
  if (username.trim().length == 0) {
    loginForm.username
      .next(".error-label")
      .text("Don't forget your username!");
    shouldHideUsernameError = false;
  }
  if (shouldHideUsernameError) {
    loginForm.username
      .next(".error-label")
      .text('');
  }

  const password = loginForm.password.val();
  let shouldHidePasswordError = true;
  if (password.length == 0) {
    loginForm.password
      .next(".error-label")
      .text("Wait! You forgot a password!");
    shouldHidePasswordError = false;
  } else if (password.length < 6) {
    loginForm.password
      .next(".error-label")
      .html("Your password must be at least<br/> 6 characters!");
    shouldHidePasswordError = false;
  }
  if (shouldHidePasswordError) {
    loginForm.password.next(".error-label").text("");
  }

  if (shouldHideUsernameError && shouldHidePasswordError) {
    $('#login-error').text('')
    startLoading()
    setTimeout(function () {
      $.ajax({
        url: endpointURL + 'authenticate',
        type: "POST",
        data: {
          username: username,
          password: password,
        },
        success: function (data) {
          console.log('success', data)
          const jwt = data.token;
          chrome.storage.sync.set({ jwtToken: jwt, username }, function () {
            finishLoading()
            $(".intro-container").fadeOut(function () {
              $(".container").fadeIn();
              initHomepage(username, jwt)
            });
          });
        }, error: function (data) {
          finishLoading()
          const parsedData = JSON.parse(data.responseText)
          if (parsedData.token == "Unauthorized") {
            $('#login-error').text("Invalid username and/or password")
            console.log('wrong password')
          } else {
            const firstError = Object.values(parsedData.errors)[0]
            $('#login-error').text(firstError)
          }
        }
      })
    }, 1000)
  }
});

const registerForm = {
  username: $('#register-username'),
  email: $("#register-email"),
  password: $("#register-password"),
  confirmPassword: $("#register-password-confirm"),
};

$("#register-button").on("click", function () {
  const username = registerForm.username.val();
  let shouldHideUsernameError = true;
  if (username.trim().length == 0) {
    registerForm.username.next('.error-label').text(`You'll need a username!`)
    shouldHideUsernameError = false;
  } else if (username.trim().length < 4) {
    registerForm.username.next('.error-label').html(`Your username must be at<br/> least 4 characters`)
    shouldHideUsernameError = false;
  } else if (username.trim().length > 64) {
    registerForm.username.next('.error-label').text(`Your username is too long!`)
    shouldHideUsernameError = false;
  }
  if (shouldHideUsernameError) {
    registerForm.username.next('.error-label').text(``)
  }

  const email = registerForm.email.val();
  let shouldHideEmailError = true;
  if (email.trim().length == 0) {
    registerForm.email
      .next(".error-label")
      .text("Remember to include your email!");
    shouldHideEmailError = false;
  } else if (!emailRegex.test(email)) {
    registerForm.email
      .next(".error-label")
      .text("Hmm... that email doesn't look right");
    shouldHideEmailError = false;
  }
  if (shouldHideEmailError) {
    registerForm.email.next(".error-label").text("");
  }

  const password = registerForm.password.val();
  let shouldHidePasswordError = true;
  if (password.length == 0) {
    registerForm.password
      .next(".error-label")
      .text("Wait! You forgot a password!");
    shouldHidePasswordError = false;
  } else if (password.length < 6) {
    registerForm.password
      .next(".error-label")
      .html("Your password must be at least<br/> 6 characters!");
    shouldHidePasswordError = false;
  } else if (password.length > 40) {
    registerForm.password
      .next(".error-label")
      .html("Your password must less than<br/> 40 characters long");
    shouldHidePasswordError = false;
  }
  if (shouldHidePasswordError) {
    registerForm.password.next(".error-label").text("");
  }

  const confirmPassword = registerForm.confirmPassword.val();
  let shouldHideConfirmPasswordError = true;
  if (shouldHidePasswordError && confirmPassword != password) {
    registerForm.confirmPassword
      .next(".error-label")
      .text("Passwords aren't the same!");
    shouldHideConfirmPasswordError = false;
  }
  if (shouldHideConfirmPasswordError) {
    registerForm.confirmPassword.next(".error-label").text("");
  }

  if (
    shouldHideUsernameError &&
    shouldHideEmailError &&
    shouldHidePasswordError &&
    shouldHideConfirmPasswordError
  ) {
    $("#register-error").text('')
    startLoading()
    setTimeout(function () {
      $.ajax({
        url: endpointURL + 'register',
        type: "POST",
        data: {
          username: username,
          email: email,
          password: password,
          confirmpassword: confirmPassword
        },
        success: function (data) {
          console.log('success', data)
          const jwt = data.token;
          chrome.storage.sync.set({ jwtToken: jwt, username }, function () {
            finishLoading()
            $(".intro-container").fadeOut(function () {
              $(".container").fadeIn();
              initHomepage(username, jwt)
            });
          });
        }, error: function (data) {
          console.log('error', data)
          finishLoading()
          const parsedData = JSON.parse(data.responseText)
          const firstError = Object.values(parsedData.errors)[0]
          $('#register-error').text(firstError)
        }
      })
    }, 1000)
  }
});

$("#click-block").click(false);

/* add tag */

const stars = $("#edit-review .stars .material-icons");

let selectedStars = 0;

stars.on("click", function () {
  const prev = $(this)
    .html("star")
    .addClass("selected")
    .prevAll()
  prev.html("star").addClass("selected");
  $(this).nextAll().html("star_border").removeClass("selected");
  selectedStars = prev.length + 1;
});

$("#edit-review #review-text").on("input", function () {
  $(this).css("height", "1px");
  $(this).css("height", 21 + $(this).prop("scrollHeight") + "px");
});

const addTagList = $("#add-tag-list");

$(addTagList).on('click', '.tag', function () {
  $(this).find('.material-icons').toggle()
})

const reviewErrorLabel = $('#review-error')
$('#edit-review #submit-review').on('click', function () {
  let shouldHideReviewError = true;
  if (selectedStars == 0) {
    reviewErrorLabel.text("Don't forget to choose a rating!")
    shouldHideReviewError = false;
  }
  if (shouldHideReviewError) {
    reviewErrorLabel.text('')
    startLoading();
  }
})

function padZero(str, len) {
  len = len || 2;
  var zeros = new Array(len).join('0');
  return (zeros + str).slice(-len);
}

const invertColorToBW = (hex) => (parseInt(hex.substring(0, 2), 16) * 0.299 + parseInt(hex.substring(2, 4), 16) * 0.587 + parseInt(hex.substring(4, 6), 16) * 0.114) > 186
  ? '#000000'
  : '#FFFFFF';

const tagSuggestions = $('#tag-input-suggestions')
let prevQueryTimeout;

const addTagInput = $('#tag-input')

addTagInput.on('input', function () {
  const query = $(this).val().trim()
  if (query.length != 0) {
    if (prevQueryTimeout) {
      clearTimeout(prevQueryTimeout)
    }
    tagSuggestions.empty().css('display', 'flex');
    tagSuggestions.html('<span class="input-suggestion-label">Loading...</span>')
    prevQueryTimeout = setTimeout(function () {
      $.ajax({
        url: endpointURL + 'gettags',
        data: {
          query
        },
        headers: { "Authorization": "Bearer " + jwtToken },
        success: function (data) {
          tagSuggestions.empty()
          if (data.data.length == 0) {
            tagSuggestions.html('<span class="input-suggestion-label">No suggestions. Want to <span class="new-tag-suggestion">create it</span>?</span>')
          } else {
            let displayedTags = 0;
            data.data.forEach(e => {
              let isUnique = true;
              const samePrivacyTagsAdded = reviewTags.find(`.tag[data-private=${e.private}]`).toArray()
              for (elem of samePrivacyTagsAdded) {
                const tagName = $(elem).find('.tag-name').text().trim()
                if (tagName.toLowerCase() == e.name.toLowerCase()) {
                  isUnique = false;
                  break;
                }
              }
              if (isUnique) {
                const tagElem = $(`<div class="tag" data-private=${e.private}>
                <span class="material-icons">${e.private ? 'visibility_off' : 'visibility'}</span>
                  <span class="tag-name">${e.name}</span>
              </div>`)
                const invertedColor = invertColorToBW(e.color)
                tagElem.css({
                  color: invertedColor,
                  backgroundColor: '#' + e.color,
                  borderColor: invertedColor
                })
                tagSuggestions.append(tagElem)
                displayedTags++;
              }
            })
            if(displayedTags == 0){
              tagSuggestions.html('<span class="input-suggestion-label">No suggestions.</span>')
            }
          }
        },
        error: function (data) {
          console.log(data);
        }
      })
    }, 500)
  } else {
    tagSuggestions.empty().hide()
  }
})

const reviewTags = $('#edit-review .tags')

tagSuggestions.on('click', '.tag', function (e) {
  $(e.target.closest('.tag')).appendTo(reviewTags)
  tagSuggestions.empty().hide()
  addTagInput.val('')
})

$(document).on('click', '.new-tag-suggestion', function(e){
  newTagPopup.show();
  e.stopPropagation()
})

$('#new-tag #new-tag-popup #new-tag-popup-colors .new-tag-color').each(function () {
  $(this).css('background-color', $(this).data('color'));
})

const tagColorActiveIndicator = $(`<div class="active-indicator"><span class="material-icons">check</span></div>`)
const tagColorCustomHex = $('#new-tag-popup-footer input')
const newTagNameInput = $('#new-tag-name')
const newTagPopupContent = $('#new-tag-popup #new-tag-popup-content')
const newTagErrorLabel = $('#new-tag-error')

$('#new-tag #new-tag-popup #new-tag-popup-colors .new-tag-color').on('click', function () {
  tagColorActiveIndicator.appendTo($(this))
  tagColorCustomHex.val($(this).data('color'))
})

tagColorCustomHex.on('input', function () {
  tagColorActiveIndicator.remove()
})

const privacyOptions = $('#new-tag #new-tag-popup .new-tag-privacy-option')
privacyOptions.on('click', function () {
  privacyOptions.removeClass('active');
  $(this).addClass('active')
})

const hexRegex = /^#[0-9A-F]{6}$/i;

const newTagPopup = $('#new-tag-popup')
const newTagToggle = $('#new-tag')
newTagToggle.on('click', function (e) {
  newTagPopup.toggle();
  e.stopPropagation();
})

newTagPopup.on('click', function (e) {
  e.stopPropagation();
})

$('#new-tag-button').on('click', function () {
  const newTagName = newTagNameInput.val()
  const customHex = tagColorCustomHex.val()
  newTagErrorLabel.text('')
  let shouldHideNewTagError = true;
  if (customHex.trim().length > 0 && customHex.substring(0, 1) != '#') {
    tagColorCustomHex.val('#' + customHex)
  }
  if (newTagName.trim().length == 0) {
    newTagErrorLabel.text(`You'll need a tag name!`)
    shouldHideNewTagError = false;
  } else if (!tagColorActiveIndicator.is(':visible') && customHex.trim().length == 0) {
    newTagErrorLabel.text(`Don't forget a tag color!`)
    shouldHideNewTagError = false;
  } else if (!privacyOptions.is('.active')) {
    newTagErrorLabel.text(`Please choose whether the tag is public/private`)
    shouldHideNewTagError = false;
  } else if (!hexRegex.test(tagColorCustomHex.val())) {
    newTagErrorLabel.text(`Invalid HEX color`)
    shouldHideNewTagError = false;
  }

  if (shouldHideNewTagError) {
    newTagErrorLabel.text('')
    startLoading(newTagPopupContent)
    setTimeout(function () {
      $.ajax({
        url: endpointURL + 'newtag',
        method: "POST",
        data: {
          name: newTagName,
          color: tagColorCustomHex.val().trim(),
          isPrivate: $('.new-tag-privacy-option.active').data('def') == 'private'
        },
        headers: {
          "Authorization": "Bearer " + jwtToken
        },
        success: function (data) {
          if (data.success) {
            finishLoading(newTagPopupContent);
            $(newTagPopup).hide()
            newTagNameInput.val('')
            tagColorCustomHex.val('')
            tagColorActiveIndicator.remove()
            $('.new-tag-privacy-option.active').removeClass('active')
          }
        },
        error: function (data) {
          finishLoading(newTagPopupContent)
          newTagErrorLabel.text(data.responseJSON.message)
        }
      })
    }, 500)
  }
})

/* boot up */

function initHomepage(username, jwt) {
  $('#profile-name').text(username)
  loadSiteReviews(jwt)
}

function loadSiteReviews(jwt) {
  startLoading()
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    const parsedURL = new URL(tabs[0].url);
    const url =
      parsedURL.protocol + "//" + parsedURL.hostname + parsedURL.pathname;
    $("#url").text(url).attr("title", url);
    $.ajax({
      url: endpointURL + 'reviews',
      type: "GET",
      data: { url },
      headers: { "Authorization": "Bearer " + jwt },
      success: function (data) {
        console.log(data);
        finishLoading()
      },
      error: function (data) {
        console.log(data)
        console.log(JSON.parse(data.responseText));
        finishLoading()
      }
    })
  });
}

function startLoading(element) {
  $('#loading').show().appendTo(element);
  $('#click-block').show().appendTo(element);
}

function finishLoading(element) {
  $('#loading').hide().appendTo(element);
  $('#click-block').hide().appendTo(element);
}

/* profile controls */
const profilePopup = $('#profile-popup')

$('.profile').on('click', function (e) {
  profilePopup.toggle()
  e.stopPropagation()
})

profilePopup.on('click', function (e) {
  e.stopPropagation();
})

$('#log-out-button').on('click', function () {
  $(this).hide()
  chrome.storage.sync.set({ jwtToken: null, username: null }, function () {
    $('.container').fadeOut(function () {
      $('.intro-container .intro-option').hide()
      $('.intro').show()
      $('.intro-container').fadeIn();
    })
  })
})

$(document).on("click", function (e) {
  if (!e.target.closest('#profile-popup')) {
    profilePopup.hide()
  }
  if (!e.target.closest('#new-tag-popup')) {
    newTagPopup.hide()
  }
});
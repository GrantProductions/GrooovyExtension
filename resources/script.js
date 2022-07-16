const endpointURL = "http://localhost:8080/api/"

if (!chrome.storage || !chrome.tabs) {
  //simulate with localStorage
  chrome.storage = {
    sync: {
      get: (e, f) => {
        const toReturn = {};
        e.forEach(g => {
          toReturn[g] = localStorage.getItem(g)
        });
        f(toReturn)
      },
      set: (e, f) => {
        Object.entries(e).forEach(g => {
          localStorage.setItem(g[0], g[1])
        });
        f()
      }
    }
  }

  chrome.tabs = {
    query: (a, b) => { b([{ url: "https://www.google.com" }]) }
  }
}

let jwtToken;
let currentURL;

chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
  const parsedURL = new URL(tabs[0].url);
  const url =
    parsedURL.protocol + "//" + parsedURL.hostname + parsedURL.pathname;
  currentURL = url;
  $("#url").text(decodeURI(url)).attr("title", decodeURI(url));
  chrome.storage.sync.get(['jwtToken', 'username'], function (result) {
    if (result.jwtToken) {
      const now = Date.now()
      let expiry;
      let validToken = true;
      try {
        expiry = jwt_decode(result.jwtToken).exp * 1000;
      } catch (err) {
        console.log('bad token')
        validToken = false;
      }
      if (validToken) {
        if (expiry > now) {
          console.log('RESULT', result)
          console.log(`jwt token still valid for ${(expiry - now) / 1000 / 60} minutes`)
          $('.intro-container').hide()
          jwtToken = result.jwtToken;
          $(document).ready(function () {
            initHomepage(result.username)
          })
        } else {
          console.log(`jwt token expired ${(now - expiry) / 1000 / 60} minutes ago`)
        }
      }
    }
  });
})
//  else {
//   currentURL = "https://www.google.com"
//   $("#url").text(currentURL).attr("title", currentURL);
// }


const skipIntroForDev = false;
if (skipIntroForDev) {
  $(".intro-container").hide();
}

const navItemInitFunctions = {
  "reviews": loadSiteReviews,
  "your-reviews": loadUserReviews
}

$(document).on('click', ".nav-item, .page-director", function () {
  if ($(this).hasClass("nav-item")) {
    $(".nav-item.active").removeClass("active");
    $(this).addClass("active");
  }
  const key = $(this).data("key");
  if (navItemInitFunctions[key]) {
    navItemInitFunctions[key]();
  }
  $("#nav-content .nav-content.active").removeClass("active");
  const target = $(`#nav-content .nav-content#${key}`)
  target.addClass('active').scrollTop(0)
})

$(".intro-container #intro-options h2").on("click", function () {
  const key = $(this).data("key");
  $(".intro").fadeOut(function () {
    $(`.intro-option#${key}`).fadeIn();
  });
});

$(".intro-container .back-director").on("click", function () {
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

$("#login-button").on("click",handleLoginAttempt);

$('#login input').on('keydown', function(e){
  if(e.keyCode == 13){
    handleLoginAttempt()
  }
})

function handleLoginAttempt(){
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
      startLoading(document.body)
      setTimeout(function () {
        $.ajax({
          url: endpointURL + 'authenticate',
          method: "POST",
          data: {
            username: username,
            password: password,
          },
          success: function (data) {
            const jwt = data.token;
            chrome.storage.sync.set({ jwtToken: jwt, username }, function () {
              finishLoading(document.body)
              jwtToken = jwt;
              $(".intro-container").fadeOut(function () {
                $(".container").fadeIn();
                clearFormValues(loginForm )
                initHomepage(username)
              });
            });
          }, error: function (data) {
            finishLoading()
            try{
            const parsedData = JSON.parse(data.responseText)
            if (parsedData.token == "Unauthorized") {
              $('#login-error').text("Invalid username and/or password")
              console.log('wrong password')
            } else {
              const firstError = Object.values(parsedData.errors)[0]
              $('#login-error').text(firstError)
            }
          }catch(err){
            showErrorMessage('An error occurred. Try closing/reopening this extension', 5000)
          }
          }
        })
      }, 1000)
    }
}

const registerForm = {
  username: $('#register-username'),
  email: $("#register-email"),
  password: $("#register-password"),  
  confirmPassword: $("#register-password-confirm"),
};

$('#register input').on('keydown', function(e){
  if(e.keyCode == 13){
    handleRegisterAttempt();
  }
})

$("#register-button").on("click", handleRegisterAttempt);

function handleRegisterAttempt() {
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
    startLoading(document.body)
    setTimeout(function () {
      $.ajax({
        url: endpointURL + 'register',
        method: "POST",
        data: {
          username: username,
          email: email,
          password: password,
          confirmpassword: confirmPassword
        },
        success: function (data) {
          const jwt = data.token;
          jwtToken = jwt;
          chrome.storage.sync.set({ jwtToken: jwt, username }, function () {
            finishLoading(document.body)
            $(".intro-container").fadeOut(function () {
              $(".container").fadeIn();
              clearFormValues(registerForm)
              initHomepage(username, jwt)
            });
          });
        }, error: function (data) {
          finishLoading()
          try {
            const parsedData = JSON.parse(data.responseText)
            const firstError = Object.values(parsedData.errors)[0]
            $('#register-error').text(firstError)
          } catch (err) {
            showErrorMessage('An error occurred. Try closing/reopening this extension', 5000);
          }
        }
      })
    }, 1000)
  }
}

$("#click-block").click(false);

function clearFormValues(obj){
  Object.values(obj).forEach(e => e.val(''))
}

/* add tag */

const editReviewSection = $('#edit-review')
const reviewsSection = $('#reviews')

const navContentArea = $('#nav-content')

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

const reviewText = $("#edit-review #review-text")

reviewText.on("input", function () {
  $(this).css("height", "1px");
  $(this).css("height", 21 + $(this).prop("scrollHeight") + "px");
});

const addTagList = $("#add-tag-list");

$(addTagList).on('click', '.tag', function () {
  $(this).find('.material-icons').toggle()
})

const reviewErrorLabel = $('#review-error')
$('#edit-review #submit-review').on('click', function () {
  reviewErrorLabel.text('')
  let shouldHideReviewError = true;
  const activePrivacyToggle = $('#edit-review #review-footer .privacy-toggle .privacy-option.active')
  if (selectedStars == 0) {
    reviewErrorLabel.text("Don't forget to choose a rating!")
    shouldHideReviewError = false;
  } else if (activePrivacyToggle.length == 0) {
    reviewErrorLabel.text("Please choose a privacy option for your review below")
    shouldHideReviewError = false;
  }
  if (shouldHideReviewError) {
    reviewErrorLabel.text('')
    startLoading(editReviewSection);
    setTimeout(function () {
      $.ajax({
        url: endpointURL + 'reviews/new',
        method: "POST",
        data: {
          url: currentURL,
          stars: selectedStars,
          text: reviewText.val(),
          tagIDs: $('#edit-review .tags .tag').map(function () { return $(this).data('id') }).toArray(),
          isPrivate: activePrivacyToggle.data('def') == 'private'
        },
        headers: { "Authorization": "Bearer " + jwtToken },
        success: function (data) {
          finishLoading(editReviewSection)
          if (data.success) {
            showSuccessMessage("Review posted", 5000)
            editReviewSection.removeClass('active');
            reviewsSection.addClass('active')
            loadSiteReviews()
          }
        },
        error: function (data) {
          finishLoading(editReviewSection)
          reviewErrorLabel.text(data.responseJSON.message)
        }

      })
    }, 500)
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
            tagSuggestions.html('<span class="input-suggestion-label">No suggestions. Want to <span class="link-suggestion">create it</span>?</span>')
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
                tagSuggestions.append(createTagElement(e.name, e.color, e.private, e.id))
                displayedTags++;
              }
            })
            if (displayedTags == 0) {
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

function createTagElement(name, color, isPrivate, id) {
  const tagElem = $(`<div class="tag" data-private=${isPrivate}><span class="material-icons">${isPrivate ? 'visibility_off' : 'visibility'}</span><span class="tag-name">${name}</span></div>`)
  const invertedColor = invertColorToBW(color)
  tagElem.css({
    color: invertedColor,
    backgroundColor: '#' + color,
    borderColor: invertedColor
  }).data('id', id)
  return tagElem;
}

const reviewTags = $('#edit-review .tags')

tagSuggestions.on('click', '.tag', function (e) {
  if (!!reviewTags.has('i.empty-label').length) {
    reviewTags.find('i.empty-label').hide()
  }
  const tag = $(e.target.closest('.tag'))
  tag.appendTo(reviewTags)
  tag.append(`<span class="material-icons delete-tag">close</span>`)
  reviewTags.scrollTop(reviewTags.height())
  tagSuggestions.empty().hide()
  addTagInput.val('')
})

reviewTags.on('click', '.tag .material-icons.delete-tag', function (e) {
  const tag = $(e.target.closest('.tag'));
  tag.remove();
  if ($('.tag', reviewTags).length == 0) {
    reviewTags.find('i.empty-label').show()
  }
})

$(document).on('click', '#edit-review #tag-input-suggestions .link-suggestion', function (e) {
  newTagPopup.show();
  newTagNameInput.val(addTagInput.val())
  newTagNameInput.focus()
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

$('.privacy-option').on('click', function () {
  $(this).parent('.privacy-toggle').find('.privacy-option').removeClass('active');
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
  } else if ($('#new-tag').has('.privacy-option.active').length == 0) {
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
          isPrivate: $('#new-tag-popup .privacy-option.active').data('def') == 'private'
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
            addTagInput.trigger('input')
            $('#new-tag-popup .privacy-option.active').removeClass('active')
            showSuccessMessage(`Created new tag '${newTagName}'`, 5000)
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

function initHomepage(username) {
  $(document).ready(function () {
    $('#profile-name').text(username)
    loadSiteReviews(jwtToken)
  })
}

/* site reviews section */

const ratingAverageLabel = $('#reviews .rating-container .rating .rating-value')

function loadSiteReviews(sortOption, callbackOnFinish) {
  startLoading(navContentArea)
  setTimeout(function () {
    const requestData = {
      url: currentURL
    }
    if (sortOption) {
      requestData.sortOption = sortOption
    }
    $.ajax({
      url: endpointURL + 'reviews',
      type: "GET",
      data: requestData,
      headers: { "Authorization": "Bearer " + jwtToken },
      success: function (data) {
        reviews.empty()
        processReviewsMetadata(data.data)
        processReviewsData(data.data.reviews, reviews)
        finishLoading(navContentArea)
        // reviewsSection.addClass('active')
        if (callbackOnFinish) {
          callbackOnFinish(true)
        }
      },
      error: function (data) {
        finishLoading()
        showErrorMessage("Failed to load website reviews. Try closing & reopening this extension", 10000)
        if (callbackOnFinish) {
          callbackOnFinish(false)
        }
      }
    })
  }, 500)
}

const reviews = $('#reviews .reviews')
const reviewsCountLabel = $('#reviews-count')
const websiteReviewStars = $('#reviews .rating-container .rating .rating-stars .material-icons')

function processReviewsMetadata(data) {
  const totalReviews = data.totalReviews
  reviewsCountLabel.text(conditionallyPlurify(totalReviews, 'review'))
  const averageRating = parseFloat(data.averageRating).toFixed(1)
  ratingAverageLabel.text(averageRating)

  const ratingBarPropNames = ["fives", "fours", "threes", "twos", "ones"]
  ratingBarPropNames.forEach(prop => {
    const barWidth = ((data[prop] / totalReviews) * 100).toFixed(2)
    $(`#reviews .rating-container .rating-distribution .rating-bar[data-def="${prop}"] > div`).css('width', barWidth + '%');
  })

  websiteReviewStars.html('star_border')
  const numOfFullStars = Math.floor(data.averageRating)
  const firstFullStars = $('#reviews .rating-container .rating .rating-stars .material-icons').slice(0, numOfFullStars)
  firstFullStars.html('star')
  if ((data.averageRating - numOfFullStars) >= 0.5) {
    firstFullStars.last().next('.material-icons').html('star_half')
  }

}

function processReviewsData(data, container, includeReviewURL) {
  const now = Date.now();

  if (data.length == 0) {
    container.html('<i class="empty-label">No reviews made yet. Want to <span class="link-suggestion page-director" data-key="edit-review">be the first</span>?</i>')
  }

  data.forEach(review => {
    const reviewElement = $(`<div class="review"><div class="review-metadata"><div class="review-author"></div><div class="review-date"></div>${includeReviewURL ? '<div class="review-url"></div>' : ''}</div><div class="review-stars"><span class="material-icons">star_border</span><span class="material-icons">star_border</span><span class="material-icons">star_border</span><span class="material-icons">star_border</span><span class="material-icons">star_border</span></div><div class="review-message"></div><div class="tags-area"><div class="tags-label"><span class="material-icons">sell</span><div>Tags:</div></div><div class="tags"></div></div></div>`);
    reviewElement.find('.review-metadata .review-author').text(review.author.username)
    if (includeReviewURL) {
      reviewElement.find('.review-metadata .review-url').text(decodeURI(review.url))
    }

    const timeDifferenceMs = now - (review.createdDateTime * 1000)
    const timeDifferenceReadable = convertMsToReadable(timeDifferenceMs)

    const reviewDateElement = reviewElement.find('.review-metadata .review-date')
    reviewDateElement.text(timeDifferenceReadable)
    reviewDateElement.on('mouseenter', function () {
      $(this).text(review.formattedDateTime)
    })

    reviewDateElement.on('mouseleave', function () {
      $(this).text(timeDifferenceReadable)
    })
    const reviewTagsArea = reviewElement.find('.tags-area')
    const reviewTagsContainer = reviewElement.find('.tags')
    if (review.tags.length == 0) {
      reviewTagsArea.hide()
    }
    review.tags.forEach(tag => {
      reviewTagsContainer.append(createTagElement(tag.name, tag.color, tag.private, tag.id))
    })

    reviewElement.find('.review-stars .material-icons').slice(0, review.stars).html('star')


    reviewElement.find('.review-message').text(review.text)
    container.append(reviewElement)

  })
}

/* reviews sort */

const reviewsSortPopup = $('#reviews-sort-popup')
const reviewsSortOptions = $('.expandable-option', reviewsSortPopup)

reviewsSortPopup.on('click', function (e) {
  e.stopPropagation();
})

// website reviews sorting
reviewsSortOptions.on('click', function () {
  const option = $(this).find('.expandable-option-label').text().trim().toLowerCase().trim()
  loadSiteReviews(option, function (didSucceed) {
    if (didSucceed) {
      reviewsSortOptions.find('.material-icons').hide();
      reviewsSortOptions.filter(`[data-def="${option}"]`).find('.material-icons').show()
    }
  })
  closeExpandablePopup(reviewsSortPopup)
})

/* user reviews */

const userReviewsSection = $('#your-reviews')
const userReviewsReviewsArea = $('#your-reviews .reviews');

function loadUserReviews(sortOption, tagFilter, callback) {
  startLoading(userReviewsSection)
  const data = {}
  if (sortOption) {
    data.sortOption = sortOption;
  }
  if (tagFilter) {
    data.tagFilter = tagFilter;
  }

  setTimeout(function () {
    $.ajax({
      url: endpointURL + 'reviews/me',
      data,
      method: "POST",
      headers: { "Authorization": "Bearer " + jwtToken },
      success: function (data) {
        if (!sortOption && !tagFilter) {
          renderTagsDropdown(data.data)
        }
        finishLoading(userReviewsSection)
        if (data.success) {
          userReviewsReviewsArea.empty()
          processReviewsData(data.data, userReviewsReviewsArea, true)
          if (callback) {
            callback(true)
          }
        }
      },
      error: function (data) {
        finishLoading(userReviewsSection)
        if (callback) {
          callback(false)
        }
      }
    })
  }, 500)
}

const userReviewsSortPopup = $('#your-reviews #your-reviews-sort-popup')

const regexQueryRegex = /\/.+\//g

const userReviewsSearch = $('#your-reviews-search')

userReviewsSearch.on('input', function () {
  const query = $(this).val()
  const lowercaseQuery = query.toLowerCase()
  let foundResults = 0;
  let isRegex = regexQueryRegex.test(query)
  let parsedRegex;
  if (isRegex) {
    parsedRegex = new RegExp(query.substring(1, query.length - 1), "g");
  }
  userReviewsReviewsArea.find('.review').each(function () {
    const review = $(this)
    const reviewMessage = review.find('.review-message').text().trim()
    if (isRegex) {
      if (parsedRegex.exec(reviewMessage)) {
        review.show();
        foundResults++;
      } else {
        review.hide();
      }
    } else {
      if (reviewMessage.toLowerCase().includes(lowercaseQuery)) {
        review.show();
        foundResults++
      } else {
        review.hide();
      }
    }
  })

  userReviewsReviewsArea.find('i.empty-label').remove()
  if (foundResults == 0) {
    const emptyLabel = $(`<i class="empty-label"></i>`)
    emptyLabel.text(`No results for '${query}'`)
    userReviewsReviewsArea.append(emptyLabel)
  } else {
    $(this).find('.empty-label').remove()
  }
})

userReviewsSearch.on('mouseenter focus', function(){
  $(this).attr('placeholder', 'Search (text or /regex/)')
})

userReviewsSearch.on('mouseleave blur', function(){
  if(!$(this).is(':focus')){
    $(this).attr('placeholder', 'Search...')
  }
})

let selectedUserReviewsSortOption;

const userReviewsSortOptions = $('.expandable-option', userReviewsSortPopup)
userReviewsSortOptions.on('click', function () {
  const sortOption = $(this)
  const sortOptionText = sortOption.find('.expandable-option-label').text().trim()
  selectedUserReviewsSortOption = sortOptionText
  userReviewsReviewsArea.empty()
  closeExpandablePopup(userReviewsSortPopup)
  loadUserReviews(sortOptionText, selectedTagFilterId, function (didSucceed) {
    if (didSucceed) {
      userReviewsSortOptions.find('.material-icons').hide();
      sortOption.find('.material-icons').show()
    }
  })
})

userReviewsSortPopup.on('click', function (e) {
  e.stopPropagation();
})

/* reviews tag filter */


const userReviewsTagFilterPopup = $('#your-reviews #your-reviews-tag-filter-popup')
userReviewsTagFilterPopup.on('click', function (e) {
  e.stopPropagation();
})

function renderTagsDropdown(data) {
  const tags = {}
  data.forEach(review => {
    review.tags.forEach(tag => {
      if (!tags[tag.id]) {
        tags[tag.id] = tag;
      }
    })
  })
  userReviewsTagFilterPopup.empty();
  const allTagsFilter = $(`<div class="expandable-option"><span class="material-icons">check</span><div class="expandable-option-label"><span class="expandable-option-label-text">None</span></div></div>`)
  userReviewsTagFilterPopup.append(allTagsFilter)
  if (!selectedTagFilterId) {
    allTagsFilter.find('.material-icons').show()
  }

  Object.values(tags).forEach(tag => {
    const tagElem = $(`<div class="expandable-option" data-def="recent" data-id="${tag.id}"><span class="material-icons">check</span><div class="expandable-option-label"><span class="material-icons">${tag.private ? 'visibility_off' : 'visibility'}</span><span class="expandable-option-label-text"></span></div></div>`)

    const invertedColor = invertColorToBW(tag.color)
    tagElem.find('.expandable-option-label > .material-icons').css({
      backgroundColor: '#' + tag.color,
      color: invertedColor,
      borderColor: invertedColor
    })
    tagElem.find('.expandable-option-label-text').text(tag.name)
    tagElem.data('id', tag.id)
    userReviewsTagFilterPopup.append(tagElem)
  })
}

let selectedTagFilterId;

$(userReviewsTagFilterPopup).on('click', '.expandable-option', function () {
  const id = $(this).data('id')
  selectedTagFilterId = id;
  console.log(id)
  closeExpandablePopup(userReviewsTagFilterPopup)
  loadUserReviews(selectedUserReviewsSortOption, selectedTagFilterId, function (didSucceed) {
    if (didSucceed) {
      userReviewsTagFilterPopup.find('.expandable-option > .material-icons').hide()
      if (!selectedTagFilterId) {
        userReviewsTagFilterPopup.find('.expandable-option').first().find('.material-icons').show()
      } else {
        userReviewsTagFilterPopup.find(`.expandable-option[data-id="${id}"] .material-icons`).show()
      }
    }
  })
})

/* general */

$(document).on("click", function (e) {
  if (!e.target.closest('#profile-popup')) {
    profilePopup.hide()
  }

  if (!e.target.closest('#new-tag-popup')) {
    newTagPopup.hide()
  }

  if (!e.target.closest('#reviews-sort-popup')) {
    closeExpandablePopup(reviewsSortPopup)
  }

  if (!e.target.closest('#your-reviews-sort-popup')) {
    closeExpandablePopup(userReviewsSortPopup)
  }

  if (!e.target.closest('#your-reviews-tag-filter-popup')) {
    closeExpandablePopup(userReviewsTagFilterPopup)
  }
});

function convertMsToReadable(ms) {
  const seconds = Math.floor(ms / 1000), minutes = Math.floor(seconds / 60), hours = Math.floor(minutes / 60), days = Math.floor(hours / 24), weeks = Math.floor(days / 30), year = Math.floor(days / 365);

  if (year != 0) {
    return conditionallyPlurify(year, 'year') + ' ago'
  } else if (weeks != 0) {
    return conditionallyPlurify(weeks, 'week') + ' ago'
  } else if (days != 0) {
    return conditionallyPlurify(days, 'day') + ' ago'
  } else if (hours != 0) {
    return conditionallyPlurify(hours, 'hour') + ' ago'
  } else if (minutes != 0) {
    return conditionallyPlurify(minutes, 'minute') + ' ago'
  } else {
    return 'a few seconds ago'
  }
}

function conditionallyPlurify(num, label) {
  return `${num} ${label}${num != 1 ? 's' : ''}`
}


function startLoading(element) {
  $('#loading').show().appendTo(element);
  $('#click-block').show().appendTo(element);
}

function finishLoading(element) {
  $('#loading').hide().appendTo(element);
  $('#click-block').hide().appendTo(element);
}

$(document).on('click', '.expandable-popup-trigger', function (e) {
  const key = $(this).data('key')
  const popupElement = $(`.expandable-popup#${key}`)
  popupElement.show();
  const [desiredWidth, desiredHeight] = [popupElement.outerWidth(), popupElement.outerHeight()]
  popupElement.hide()
  popupElement.css({ 'display': 'flex', 'height': 0, 'width': 0 }).animate({
    width: desiredWidth,
    height: desiredHeight
  }, 300)
  e.stopPropagation();
})

function closeExpandablePopup(popup) {
  popup.fadeOut(100)
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

/* notifications */

const notifications = $('#notifications')


function showSuccessMessage(message, timeout) {
  showMessage(message, timeout, 'check', 'green')
}

function showErrorMessage(message, timeout) {
  showMessage(message, timeout, 'priority_high', 'red')
}

const notificationElement = $(`<div class="notification"><div class="icon"><span class="material-icons type-icon"></span></div><div class="message"></div><span class="material-icons notification-close">close</span></div>`)
function showMessage(message, timeout, iconCode, iconBg) {
  const notification = notificationElement.clone();
  notification.find('.message')
    .text(message)
  notification.find('.icon')
    .css('background-color', iconBg)
    .find('span.type-icon').html(iconCode);
  notification.find('.notification-close').on('click', function () {
    notification.remove();
  })
  notification.hide().prependTo(notifications)
  notification.fadeIn();
  setTimeout(function () {
    notification.fadeOut(function () {
      notification.remove()
    })
  }, timeout)
}
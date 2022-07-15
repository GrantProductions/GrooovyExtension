chrome.storage.sync.get(['jwtToken'], function(result) {
  if(result.jwtToken){
    const now = Date.now()
    console.log(result.jwtToken)
    const expiry = jwt_decode(result.jwtToken).exp * 1000;
    if(expiry > now){
      console.log(`jwt token still valid for ${(expiry - now) / 1000 / 60} minutes`)
      $('.intro-container').hide()
    }else{
      console.log(`jwt token expired ${(now - expiry) / 1000 / 60} minutes ago`)
    }
  }
});

const exampleTags = [
  { name: "Entertainment", color: "#e6584e" },
  { name: "Programming", color: "#2ba9e3" },
  { name: "Cool", color: "#2ba9e3" },
  { name: "For School", color: "#e32bb2" },
];

const skipIntroForDev = false;
if (skipIntroForDev) {
  $(".intro-container").hide();
}

if (chrome.tabs) {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    const parsedURL = new URL(tabs[0].url);
    const url =
      parsedURL.protocol + "//" + parsedURL.hostname + parsedURL.pathname;
    $("#url").text(url).attr("title", url);
  });
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
  if(username.trim().length == 0){
    loginForm.username
      .next(".error-label")
      .text("Don't forget your username!");
      shouldHideUsernameError = false;
  }
  if(shouldHideUsernameError){
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
    $("#loading").show();
    $("#click-block").show();
    setTimeout(function () {
      $.ajax({
        url: 'http://localhost:8080/api/authenticate',
        type: "POST",
        data: {
          username: username,
          password: password,
        },
        success: function (data) {
          console.log('success', data)
          const jwt = data.token;
          chrome.storage.sync.set({ jwtToken: jwt }, function () {
            $("#loading").hide();
            $("#click-block").hide();
            $(".intro-container").fadeOut(function () {
              $(".container").fadeIn();
            });
          });
        }, error: function (data) {
          console.log('error', data)
          $("#loading").hide();
          $("#click-block").hide();
          const parsedData = JSON.parse(data.responseText)
          const firstError = Object.values(parsedData.errors)[0]
          $('#register-error').text(firstError)
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
    $("#loading").show();
    $("#click-block").show();
    setTimeout(function () {
      $.ajax({
        url: 'http://localhost:8080/api/register',
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
          chrome.storage.sync.set({ jwtToken: jwt }, function () {
            $("#loading").hide();
            $("#click-block").hide();
            $(".intro-container").fadeOut(function () {
              $(".container").fadeIn();
            });
          });
        }, error: function (data) {
          console.log('error', data)
          $("#loading").hide();
          $("#click-block").hide();
          const parsedData = JSON.parse(data.responseText)
          const firstError = Object.values(parsedData.errors)[0]
          $('#register-error').text(firstError)
        }
      })
    }, 1000)
  }
});

$("#click-block").click(false);

const stars = $("#edit-review .stars .material-icons");

stars.on("click", function () {
  $(this)
    .html("star")
    .addClass("selected")
    .prevAll()
    .html("star")
    .addClass("selected");
  $(this).nextAll().html("star_border").removeClass("selected");
});

$("#edit-review #review-text").on("input", function () {
  $(this).css("height", "1px");
  $(this).css("height", 21 + $(this).prop("scrollHeight") + "px");
});

const addTagPopup = $("#add-tag-popup");
const addTagList = $("#add-tag-list");

$(addTagList).on('click', '.tag', function () {
  $(this).find('.material-icons').toggle()
})

addTagPopup.on("click", function (e) {
  e.stopPropagation();
});

$("#edit-review #review-tags #add-tag").on("click", function (e) {
  addTagPopup.show();
  addTagList.empty();
  exampleTags.forEach((e) => {
    addTagList.append(`
            <div class="tag">
                <span class="material-icons selected-tag">done</span>
                ${e.name}
            </div>
        `);
  });
  e.stopPropagation();
});

$(document).on("click", function (e) {
  if (!e.target.closest("#add-tag-popup")) {
    addTagPopup.hide();
  }
});

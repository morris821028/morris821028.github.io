(function($) {
    "use strict";
    $.fn.extend({
        ukagaka: function(options, arg) {
            if (options && typeof(options) == 'object') {
                options = $.extend({}, $.ukagaka.defaults, options);
            } else {
                options = $.extend($.ukagaka.defaults, options);
            }

            this.each(function() {
                new $.ukagaka(this, options, arg);
            });
            return;
        }
    });

    var MediaPlayer = function() {
        var that = {};
        that.toggle = function() {
            $("#playblock").toggle('blind', null, 0);
        }
        that.html = function() {
            return '<div id="playblock"><div id="player"><div class="ctrl"><div class="tag"><strong>Title</strong><span class="artist">Artist</span><span class="album">Album</span></div><div class="control"><i class="icon-backward"></i><i class="icon-play"></i><i class="icon-forward"></i><span class="progress"><i class="icon-repeat repeat"></i><i class="icon-random"></i></span><span class="volume"><i class="icon-volume-up"></i><div class="slider"><div class="pace"></div></div></span></div><div class="progress"><div class="slider"><div class="loaded"></div><div class="pace"></div></div><div class="timer right">0:00</div></div></div></div></div>';
        }
        that.deploy = function(playlist_json) {
            var player = $('#playblock');
            var repeat = localStorage.repeat || 0,
                shuffle = localStorage.shuffle || 'false',
                continous = true,
                autoplay = false,
                track = 0,
                playlist = playlist_json;

            var time = new Date(),
                currentTrack = shuffle === 'true' ? time.getTime() % playlist.length : 0,
                trigger = false,
                audio, timeout, isPlaying, playCounts;

            var play = function() {
                audio.play();
                player.find('.icon-play').addClass('icon-pause');
                timeout = setInterval(updateProgress, 500);
                isPlaying = true;
            }

            var pause = function() {
                audio.pause();
                player.find('.icon-play').removeClass('icon-pause');
                clearInterval(updateProgress);
                isPlaying = false;
            }

            // Update progress
            var setProgress = function(value) {
                var currentSec = parseInt(value % 60) < 10 ? '0' + parseInt(value % 60) : parseInt(value % 60),
                    ratio = value / audio.duration * 100;

                player.find('.timer').html(parseInt(value / 60) + ':' + currentSec);
                player.find('.progress .pace').css('width', ratio + '%');
                player.find('.progress .slider a').css('left', ratio + '%');
            }

            var updateProgress = function() {
                setProgress(audio.currentTime);
            }

            // Progress slider
            player.find('.progress .slider').slider({
                step: 0.1,
                slide: function(event, ui) {
                    $(this).addClass('enable');
                    setProgress(audio.duration * ui.value / 100);
                    clearInterval(timeout);
                },
                stop: function(event, ui) {
                    audio.currentTime = audio.duration * ui.value / 100;
                    $(this).removeClass('enable');
                    timeout = setInterval(updateProgress, 500);
                }
            });

            // Volume slider
            var setVolume = function(value) {
                audio.volume = localStorage.volume = value;
                player.find('.volume .pace').css('width', value * 100 + '%');
                player.find('.volume .slider a').css('left', value * 100 + '%');
            }

            var volume = localStorage.volume || 0.5;
            player.find('.volume .slider').slider({
                max: 1,
                min: 0,
                step: 0.01,
                value: volume,
                slide: function(event, ui) {
                    setVolume(ui.value);
                    $(this).addClass('enable');
                    player.find('.icon-volume-up').removeClass('enable');
                },
                stop: function() {
                    $(this).removeClass('enable');
                }
            }).children('.pace').css('width', volume * 100 + '%');

            player.find('.icon-volume-up').click(function() {
                if ($(this).hasClass('enable')) {
                    setVolume($(this).data('volume'));
                    $(this).removeClass('enable').removeClass('icon-volume-off');
                } else {
                    $(this).data('volume', audio.volume).addClass('enable').addClass('icon-volume-off');
                    setVolume(0);
                }
            });

            // Switch track
            var switchTrack = function(i) {
                if (i < 0) {
                    track = currentTrack = playlist.length - 1;
                } else if (i >= playlist.length) {
                    track = currentTrack = 0;
                } else {
                    track = i;
                }

                $('audio').remove();
                loadMusic(track);
                if (isPlaying == true) play();
            }

            // Shuffle
            var shufflePlay = function() {
                var time = new Date(),
                    lastTrack = currentTrack;
                currentTrack = time.getTime() % playlist.length;
                if (lastTrack == currentTrack)++currentTrack;
                switchTrack(currentTrack);
            }

            // Fire when track ended
            var ended = function() {
                pause();
                audio.currentTime = 0;
                playCounts++;
                if (continous == true) isPlaying = true;
                if (repeat == 1) {
                    play();
                } else {
                    if (shuffle === 'true') {
                        shufflePlay();
                    } else {
                        if (repeat == 2) {
                            switchTrack(++currentTrack);
                        } else {
                            if (currentTrack < playlist.length) switchTrack(++currentTrack);
                        }
                    }
                }
            }

            var beforeLoad = function() {
                var endVal = this.seekable && this.seekable.length ? this.seekable.end(0) : 0;
                player.find('.progress .loaded').css('width', (100 / (this.duration || 1) * endVal) + '%');
            }

            // Fire when track loaded completely
            var afterLoad = function() {
                if (autoplay == true) play();
            }

            // Load track
            var loadMusic = function(i) {
                var item = playlist[i],
                    newaudio = $('<audio>').html('<source src="' + item.mp3 + '"><source src="' + item.ogg + '">').appendTo('#player');

                player.find('.tag').html('<strong>' + item.title + '</strong><span class="artist">' + item.artist + '</span><span class="album">' + item.album + '</span>');
                audio = newaudio[0];
                audio.volume = player.find('.icon-volume-up').hasClass('enable') ? 0 : volume;
                audio.addEventListener('progress', beforeLoad, false);
                audio.addEventListener('durationchange', beforeLoad, false);
                audio.addEventListener('canplay', afterLoad, false);
                audio.addEventListener('ended', ended, false);
            }

            loadMusic(currentTrack);
            player.find('.icon-play').on('click', function() {
                if ($(this).hasClass('icon-pause')) {
                    pause();
                } else {
                    play();
                }
            });
            player.find('.icon-forward').on('click', function() {
                if (shuffle === 'true') {
                    shufflePlay();
                } else {
                    switchTrack(--currentTrack);
                }
            });
            player.find('.icon-backward').on('click', function() {
                if (shuffle === 'true') {
                    shufflePlay();
                } else {
                    switchTrack(++currentTrack);
                }
            });

            if (shuffle === 'true') player.find('.icon-random').addClass('enable');
            if (repeat == 1) {
                player.find('.repeat').addClass('once');
            } else if (repeat == 2) {
                player.find('.repeat').addClass('all');
            }

            player.find('.icon-repeat').on('click', function() {
                if ($(this).hasClass('once')) {
                    repeat = localStorage.repeat = 2;
                    $(this).removeClass('once').addClass('all').addClass('icon-refresh');
                } else if ($(this).hasClass('all')) {
                    repeat = localStorage.repeat = 0;
                    $(this).removeClass('all').removeClass('icon-refresh');
                } else {
                    repeat = localStorage.repeat = 1;
                    $(this).addClass('once');
                }
            });

            player.find('.icon-random').on('click', function() {
                if ($(this).hasClass('enable')) {
                    shuffle = localStorage.shuffle = 'false';
                    $(this).removeClass('enable');
                } else {
                    shuffle = localStorage.shuffle = 'true';
                    $(this).addClass('enable');
                }
            });
        }
        return that;
    }

    $.ukagaka = function(elem, options, arg) {
        $.getJSON(options.jsonPath, function(json) {
            options.modelConfig = json;
            if (options && typeof(options) == 'string') {
                if (options == 'loadTalk')
                    loadTalk(options);
                return;
            } else {
                init(elem, options);
            }
        });

        /**
         *  load model image relative path
         */
        function loadImagePath(options, status, index) {
            if (index < 0)
                index = Math.floor(Math.random() * options.modelConfig.motions[status].length);
            return options.modelConfig.filepath + 
                    options.modelConfig.motions[status][index].file;
        }
        /**
         *  load ui text with model
         */
        function loadUItext(options, label) {
            return options.modelConfig.ui[label];
        }

        function init(elem, options) {
            var obj = $(elem),
                sheetfield = options.googleSheetField;

            $.ukagaka.mp3player = MediaPlayer();

            obj.append(
                "<div id='ukagaka_logbox' class='ukagaka_block'>" + 
                    "<div class=\"chat-box-content\">" +
                        $.ukagaka.mp3player.html() +
                        "<div class='ukagaka_box'>" +
                            "<div class='ukagaka_msg' id='ukagaka_msgbox'></div>" +
                            "<div class='ukagaka_msg' id='ukagaka_menubox' style='display:none'>" + 
                                loadUItext(options, 'menuMainText') + 
                                "<br/><br/><span id='ukagaka_menu_btn_addstring'>" + 
                                loadUItext(options, 'menuLearnText') + 
                                "</span><span id='ukagaka_menu_btn_renewlist'>" + 
                                loadUItext(options, 'menuLogText') + 
                                "</span><span id='ukagaka_menu_btn_exit'>" + 
                                loadUItext(options, 'menuExitText') + 
                            "</span></div>" + 
                            "<div class='ukagaka_msg' id='ukagaka_stringinput' style='display:none'>" + 
                                loadUItext(options, 'menuQueryText') + 
                                "<input id='ukagaka_addstring' type='text' placeholder='" + loadUItext(options, 'learnPlaceholder') + "'/><br/><span id='ukagaka_addmenu_add'>" + 
                                loadUItext(options, 'menuSubmitText') + "</span><span id='ukagaka_btn_menu'>" + 
                                loadUItext(options, 'menuCancelText') + "</span></div>" +
                            "<div class='ukagaka_msg' id='ukagaka_renewlist' style='display:none'>" + loadUItext(options, 'logText') + "<span id='ukagaka_btn_menu'>" + loadUItext(options, 'menuCancelText') + "</span></div>" + 
                            "<input id='ukagaka_sheetfield' type='hidden' value='" + sheetfield + "'>" +
                        "</div>" +
                    "</div>" +
                "</div>" 
            );
            
            obj.after(
                    "<img class='ukagaka_img' src='" + loadImagePath(options, 'idle', 0) + "'></img>" + 
                    "<div id='ukagaka_controlpanel'><ul>" +
                            "<li id='ukagaka_btn_up'><i class='icon-gotop'></i></li>" +
                            "<li id='ukagaka_btn_down'><i class='icon-godown'></i></li>" +
                            "<li id='ukagaka_btn_menu'><i class='icon-learn'></i></li>" +
                            "<li id='ukagaka_btn_music'><i class='icon-music'></i></li>" +
                            "<li id='ukagaka_btn_refresh'><i class='icon-refresh'></i></li>" +
                            "<li id='ukagaka_btn_power'><i class='icon-power'></i></li>" +
                    "</ul></div>"
            );

            loadTalk(options);
            actionSetting(options, elem);

            $.ukagaka.mp3player.deploy(options.modelConfig.playlist);
            $.ukagaka.mp3player.toggle();
        }
        /*
            loadTalk(options)
                load talk text by JSON from google spreadsheets
        */
        function loadTalk(opt) {
            var key = opt.googleKey,
                sheet = opt.googleSheet,
                formkey = opt.googleFormkey,
                sheetfield = opt.googleSheetField;

            var text2html = function(text) {
                return text.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
            }

            $.getJSON("https://spreadsheets.google.com/feeds/list/" + key + "/" + sheet + "/public/values?alt=json", function(JData) {
                for (var i = 0; i < JData.feed.entry.length; i++) {
                    $.ukagaka.talking[i] = text2html(JData.feed.entry[i].gsx$storedatabase.$t);
                }
                showText($.ukagaka.talking[Math.floor(Math.random() * $.ukagaka.talking.length)]);
                $('input#ukagaka_addstring').attr('placeholder', $.ukagaka.ukagakaText + '學會了' + JData.feed.entry.length + '個字彙');
            });
        }

        function isXSSsafe(text) {
            return text.length >= 1 && text.indexOf('script') == -1 && text.indexOf('body') == -1 &&
                text.indexOf('style') == -1 && text.indexOf('link') == -1 && text.indexOf('iframe') == -1 && 
                text.indexOf('head') == -1 && text.indexOf('nav') == -1 && text.indexOf('object') == -1 && 
                text.indexOf('embed') == -1 && text.indexOf('>') == -1 && text.indexOf('>') == -1;
        }

        function sendLearnText(options) {
            var formkey = options.googleFormkey;
            var add = $("input#ukagaka_addstring").val(),
                googleSheetField = $('input#ukagaka_sheetfield').val(),
                sendData = {googleSheetField : add};
                
            if (isXSSsafe(add)) {
                $.get('https://docs.google.com/forms/d/'+formkey+'/formResponse?'+googleSheetField+"="+add, function(data) {
                    showText(loadUItext(options, "learnText"));
                });
            } else {
                alert(loadUItext(options, 'rejectText'));
            }
            $(".ukagaka_box div").fadeOut(500);
        }

        function showText(text) {
            $.ukagaka.nextText = text;
        }

        function actionSetting(opt, elem) {
            $.ukagaka.typed = new Typed("#ukagaka_msgbox", {
                strings: [$.ukagaka.nowText],
                    typeSpeed: 20,
                    contentType: 'html',
                    loop: false,
                    backDelay: 500,
                    loopCount: false,
                    onReset: function(self) {
                        self.strings[0] = $.ukagaka.nextText;
                        $.ukagaka.nowText = $.ukagaka.nextText;  
                    }
            });
            setInterval(function() {
                if ($.ukagaka.nowText == $.ukagaka.nextText)
                    return;
                $.ukagaka.typed.reset();
            }, 1000);

            var obj = $(elem);
            var loadingText = opt.loadingText;

            if (navigator.userAgent.match(/Android|iPhone|iPad/i)) {
                $(".ukagaka_img").hide();
                $(".ukagaka_box").hide();
            } else {
                $(window).load(function() {
                    var talk_timer = setInterval(talkingbox, opt.talkTime);

                    function talkingbox() {
                        if ($("#ukagaka_msgbox").css("display") != 'none' && $.ukagaka.talkValid == true) {
                            showText($.ukagaka.talking[Math.floor(Math.random() * $.ukagaka.talking.length)]);
                        }
                    }
                });
                loadTalk(opt);
            }
            showText(loadingText);

            var scrollDelay = 1000,
                fadeOutSpeed = 300,
                fadeInSpeed = 300;

            function menuClick($select) {
                $(".ukagaka_box div").fadeOut(fadeOutSpeed);
                $select.delay(fadeOutSpeed).fadeIn(fadeInSpeed);
            }

            $(document).on('click', "#ukagaka_btn_up", function(event) {
                $("html,body").animate({
                    scrollTop: 0
                }, scrollDelay);
            }).on('click', "#ukagaka_btn_down", function(event) {
                $("html,body").animate({
                    scrollTop: document.body.scrollHeight
                }, scrollDelay);
            }).on('click', "#ukagaka_menu_btn_exit", function(event) {
                menuClick($("#ukagaka_msgbox"));
            }).on('click', "#ukagaka_btn_menu", function(event) {
                menuClick($("#ukagaka_menubox"));
            }).on('click', "#ukagaka_menu_btn_addstring", function(event) {
                menuClick($("#ukagaka_stringinput"));
            }).on('click', "#ukagaka_menu_btn_renewlist", function(event) {
                menuClick($("#ukagaka_renewlist"));
            }).on('click', "#ukagaka_addmenu_add", function(event) {
                sendLearnText(options);
            }).on('click', "#ukagaka_btn_refresh", function(event) {
                $(".ukagaka_img").attr("src", loadImagePath(options, 'idle', -1));
            }).on('click', "#ukagaka_btn_music", function(event) {
                $.ukagaka.mp3player.toggle();
            }).on('click', "#ukagaka_btn_power", function(event) {
                $(".chat-box-content, .ukagaka_img").toggle();
            });
        }
    };

    $.ukagaka.defaults = {
        jsonPath: 'js/ukagaka/assets/chiyo/chiyo.model.json',
        modelConfig: null,
        googleKey: '0ArRwmWo93u-mdG93a2dkSWxIbHEzZjRIeDdxZXdsU1E',
        googleFormkey: '1xADUIiBq1ksH7lxwSch1Nz_p2gSxdJttmv5OJOxJye0',
        googleSheet: "od6",
        googleSheetField: "entry.2030600456",
        talkTime: 60000
    };

    $.ukagaka.talking = [];

    $.ukagaka.talkValid = true;
    $.ukagaka.nextText = '';
    $.ukagaka.nowText = '';
    $.ukagaka.ukagakaText = '';
    $.ukagaka.mp3player = '';
    $.ukagaka.typed = '';

})(jQuery);
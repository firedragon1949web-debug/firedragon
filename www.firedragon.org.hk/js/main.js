var loadedCount = 0;
var loadedTotal = 2;
var loaderInit  = 0;
var loaderDone  = 0;

var resizeDelay;
var page = 'home';


var scrollFrameMax = 10;
var scrollRatio = 0;

var buttonCanvasList = [];
var fdFontSize = 16;

var windowW = 1000;
var lastWindowW = 0;

$(document).ready(function(){
	loadedCount++;
});

function checkLoad(){
	resizeDelayH();
	loadedCount++;
	
	if(loadedCount === loadedTotal){ init(); }
}

function isScrolledIntoViewInRatio(elem, r){
	var elemTop = $(elem).offset().top;
	return (elemTop - $(window).scrollTop() < $(window).height()*r);
}

function isScrolledIntoView(elem){
    var docViewTop = $(window).scrollTop();
    var docViewBottom = docViewTop + $(window).height();

    var elemTop = $(elem).offset().top;
    var elemBottom = elemTop + $(elem).outerHeight(true);
	//console.log(elemBottom)
	return (docViewTop+$(window).height() > elemTop && docViewTop < elemBottom);
	//return (docViewTop+windowH*0.5 > elemTop)
    //return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
}

function init(){
	setTimeout(function(){
		$('.grid-container > div > div').each(function(){
			$(this).css('background-image', 'url('+$(this).attr('bg')+')');
		});
	}, 400);
	
	setTimeout(function(){
	$('.grid-container > div').each(function(){
		$(this).css('background-image', 'url('+$(this).attr('bg')+')');
	});
	}, 800);
	
	
	$('.grid-container > div > div').each(function(){
		$(this).css('animation-duration', (7500+Math.random()*2500)+'ms');
	});
	
	$('#home-intro span').append('<br/>');
	
	$('.landing-logo-container').addClass('active');
	$('.landing-container, .header-container').addClass('active');
	 
	
	$('.expandable-head').click(function(){
		$(this).toggleClass('active');
		$(this).siblings('.expandable-body').stop().slideToggle(400);
	})
	
	
	$('.canvas-button').each(function(){
		var canvas = document.getElementById($(this).attr('id'));
		var ctx = canvas.getContext("2d");
		
		buttonCanvasList.push(ctx);
	});
	
	resizeH();
	
	$('.grid-container > div > div').each(function(){
		$(this).css('animation-delay', (0.1+Math.random()*2)+'s');
	});
	
	$('.slideshow-container').each(function(index){
		var mc = new Hammer(document.getElementById($(this).attr('id')));
		var mcid = $(this).attr('id');
		
		mc.on("swipeleft", function(ev) {
			slideshowNavH($('#'+mcid), 0, -1);
        });
        mc.on("swiperight", function(ev) {
			slideshowNavH($('#'+mcid), 1, -1);
        });
	});
	
	$('.column-img-indicator > div').click(function(){ 
		$(this).addClass('active');
		$(this).siblings('div').removeClass('active');
		
		var currentBanner = parseInt($(this).parent('div').parent('div').attr('currentSlide'));
		var targetBanner = $(this).parent('div').children('div').index($(this));
		var targetEle = $(this).parent('div').parent('div');
  
		if(targetBanner !== currentBanner){
			if(targetBanner > currentBanner){
			   slideshowNavH(targetEle, 0, targetBanner);
			}else{ 
			   slideshowNavH(targetEle, 1, targetBanner);
			}
		}
	});
	
	$('.location-block').click(function(){ 
		var tempIndex = $('.location-block').index($(this)); 
		
		$(this).addClass('active');
		$(this).siblings('div').removeClass('active');
		
		$('.location-landscape-container > div').addClass('active')
		
		$('.inner-container.location .txt-section-body').each(function(index){
			if(index === tempIndex){
				$(this).addClass('show');
			}else{
				$(this).removeClass('show');
			}
		})
	});
	
	$('.lightbox-icon-container').click(function(){ 
		$('.location-block').removeClass('active');
		$('.location-landscape-container > div').removeClass('active')
	});
	
	var hoverEle = '.nav-container.txt-large, .fd-button-container, .menu-ele-container-inner, .column-img-indicator > div, .location-block, .lang-container';
	
	
	if(device.mobile() || device.tablet()){
		$(hoverEle).touchstart(function(){
			$(this).addClass('hover');
			drawFdButtons();
		});
		$(hoverEle).touchend(function(){
			$(this).removeClass('hover');
			drawFdButtons();
		});
	}else{
		$(hoverEle).mouseenter(function(){
			$(this).addClass('hover');
			drawFdButtons();
		});
		$(hoverEle).mouseleave(function(){
			$(this).removeClass('hover');
			drawFdButtons();
		});
	};
	
	
	$('.menu-icon-container').click(function(){
		$('.menu-icon-container, .menu-container').toggleClass('active');
		$('.header-container').toggleClass('menu')
	})
	
	
	$('.grid-container > div').each(function(){
		$(this).css('transition-delay', (200+Math.random()*600)+'ms');
	});
	
	$('.route-map a').click(function(e){
		e.preventDefault();
		
		$(this).parent('div').find('.fd-button-container').removeClass('active');
		$(this).children('.fd-button-container').addClass('active'); 
		
		var mapIndex =$('.route-map a').index($(this));
		
		$('.route-map .column-img-container > div').css('background-image', 'none');
		
		$('.route-map .column-img-container > div').each(function(index){
			if(index == mapIndex){
				$(this).css('background-image', 'url('+$(this).attr('img')+')');
				$(this).addClass('active');
			}else{
				
				$(this).removeClass('active');
			}
		});
		
		drawFdButtons();
	});
	
	
	$(window).scroll(function(){ 
		resizeDelayH();
		if(scrollRatio < 0.1){
			 $('.animation-ele-container').css('opacity', scrollRatio*10)  
		}else{
			 $('.animation-ele-container').css('opacity', 1)  
		}
		
		$('.grid-container > div').each(function(){
			if(isScrolledIntoView($(this))){
				$(this).addClass('active');
			}else{
				$(this).removeClass('active');
			}
		});
		
		$('.fadeintext').each(function(){
			if(isScrolledIntoViewInRatio($(this), $(this).attr('ratio'))){
				$(this).addClass('active');
			}else{
				$(this).removeClass('active');
			}
		})
		
		if($('.grid-container').length > 0){
			$('.landing-container').css('transform', 'translateY(-'+($(window).scrollTop()*0.2)+'px)')
		}else{
			$('.landing-container').css('transform', 'translateY(-'+($(window).scrollTop()*1)+'px)')		 
		}
		
		if($(window).scrollTop() > $('.landing-container').outerHeight(true)*1.2){
		   $('.landing-container').addClass('off');
		}else{
		   $('.landing-container').removeClass('off');
		}
	}); 
	
	$(window).scroll();
} 


function resizeH(){
	clearTimeout(resizeDelay);
	resizeDelay = setTimeout(function(){ resizeDelayH(); }, 0);
}

function resizeDelayH(){
	lastWindowW = windowW;
	windowW = $(window).width();
	
	
	$('.scrollarea-container').css('height', scrollFrameMax*100+'%');
	scrollRatio = $(window).scrollTop()/((scrollFrameMax-1)*$('.all-container').height());
	scrollRatio = scrollRatio.toFixed(3);
	scrollRatio = Math.max(scrollRatio, 0);
	scrollRatio = Math.min(scrollRatio, 1);
	
	if(windowW != lastWindowW){
		$('.timeline-img-container').each(function(index){
			var ratio = 1;
			if($(this).hasClass('portrait')){
				ratio = 0.75;
			}
			
			
			if($(window).width() < 640){
				$(this).css('width', ratio*(100+Math.random()*0)+'%');
			}else if($(window).width() < 1024){
				$(this).css('width', ratio*(50+Math.random()*25)+'%');
			}else{
				$(this).css('width', ratio*(35+Math.random()*25)+'%');
			
				if(index%2 === 1){
					$(this).css('transform', 'translateX('+(Math.random()*15)/ratio+'%)');
				}else{
					$(this).css('transform', 'translateX(-'+(Math.random()*15)/ratio+'%)');
				}
			}
		})
		
		if($('.location-landscape-container').length > 0){
			if($(window).width() < 1024){
			   	$('.location-landscape-container .column-txt-container').css('height', '100%');
			}else{
				$('.location-landscape-container .column-txt-container').css('height', 0);
				$('.location-landscape-container .column-txt-container .txt-section-body').each(function(){
					$('.location-landscape-container .column-txt-container').css('height', Math.max($('.location-landscape-container .column-txt-container').height(), $(this).height()));	
				});   
			}
			
		}
	}
	
	drawFdButtons();
	 
	
}

function drawFdButtons(){ 
	$('.canvas-button').each(function(){
		$(this).attr('width', $(this).parent('div').outerWidth(true));
		$(this).attr('height', $(this).parent('div').outerHeight(true) - parseInt($(this).parent('div').css('margin-top')));
		$(this).css('width', $(this).parent('div').outerWidth(true));
		$(this).css('height', $(this).parent('div').outerHeight(true) - parseInt($(this).parent('div').css('margin-top')));
	});
	
	fdFontSize = parseInt($('.fd-button-container').css('font-size')); 
	
	for(var c=0; c<buttonCanvasList.length; c++){
		//
		buttonCanvasList[c].clearRect(0,0, $('.canvas-button:eq('+c+')').width(), $('.canvas-button:eq('+c+')').height());
		buttonCanvasList[c].beginPath();
		buttonCanvasList[c].translate(0.5, 0.5);
		buttonCanvasList[c].lineWidth = 1; 
		
		if($('.fd-button-container:eq('+c+')').hasClass('static')){
		   buttonCanvasList[c].strokeStyle = "#e63278"; 
		}else{
		   buttonCanvasList[c].strokeStyle = "#ffffff"; 
		}
		
		
		buttonCanvasList[c].moveTo(1, 1);
		buttonCanvasList[c].lineTo(1, $('.canvas-button:eq('+c+')').height()-2);
		buttonCanvasList[c].lineTo($('.canvas-button:eq('+c+')').width()-2 - fdFontSize, $('.canvas-button:eq('+c+')').height()-2);
		buttonCanvasList[c].lineTo($('.canvas-button:eq('+c+')').width()-2, $('.canvas-button:eq('+c+')').height() -2 - fdFontSize);
		buttonCanvasList[c].lineTo($('.canvas-button:eq('+c+')').width()-2, 1);
		buttonCanvasList[c].lineTo(1,1);
		buttonCanvasList[c].stroke();
		
		if($('.canvas-button:eq('+c+')').parent('div').hasClass('hover') || $('.canvas-button:eq('+c+')').parent('div').hasClass('active')){
			if($('.fd-button-container:eq('+c+')').hasClass('static')){
			   buttonCanvasList[c].fillStyle = "#e63278"; 
			}else{
			   buttonCanvasList[c].fillStyle = "#ffffff"; 
			} 
			buttonCanvasList[c].fill(); 
		}
		buttonCanvasList[c].closePath();
		//
	}
}

function slideshowNavH(ele, dir, s=-1){
	var totalSlide = ele.find('.slideshow-ele').length;
	var prevSlide = parseInt(ele.attr('currentSlide'));
	var currentSlide = parseInt(ele.attr('currentSlide'));
	
	if(totalSlide > 1){
	if(dir === 0){ 
		currentSlide++;
        if(currentSlide >= totalSlide){
            currentSlide = 0;
        } 
		
		if(s > -1){ currentSlide = s; } 
		
		ele.find('.slideshow-ele').each(function(index){
			if(index === currentSlide){
                $(this).removeClass('slideshow-right-center slideshow-center-left slideshow-left-center slideshow-center-right');
                $(this).addClass('active slideshow-right-center');

            }else if($(this).hasClass('active')){
                $(this).removeClass('active slideshow-right-center slideshow-center-left slideshow-left-center slideshow-center-right');
                $(this).addClass('slideshow-center-left')
            }
		});
		 
	}else{
		currentSlide--;
        if(currentSlide < 0){
            currentSlide = totalSlide-1;
        }
		if(s > -1){ currentSlide = s; }
		
		ele.find('.slideshow-ele').each(function(index){
			if(index === currentSlide){
                $(this).removeClass('slideshow-right-center slideshow-center-left slideshow-left-center slideshow-center-right');
                $(this).addClass('active slideshow-left-center');

            }else if($(this).hasClass('active')){
                $(this).removeClass('active slideshow-right-center slideshow-center-left slideshow-left-center slideshow-center-right');
                $(this).addClass('slideshow-center-right')
            }
		}); 
	}
	 
	
	ele.find('.column-img-indicator').children('div').each(function(index){
		if(index === currentSlide){
			$(this).addClass('active');
		}else{
			$(this).removeClass('active');
		}
	})
	 
	ele.attr('currentSlide', currentSlide); 
	}
}

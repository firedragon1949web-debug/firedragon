
function checkEmail(email) {
	var isValidEmail = false;
	var filter = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
	if (!filter.test(email)) {
		email.focus;
	}else{
		isValidEmail = true;
	}
	return isValidEmail;
}
function checkTel(t){
	var filter = /^([0-9_\.\-])+$/;
    if(!filter.test(t) || t.length !== 8 || t.substr(0,1) === '0' || t.substr(0,1) === '1' || t.substr(0,1) === '4' || t.substr(0,1) === '7' || t.substr(0,1) === '8'){
    	return false;
    }else{
		return true;
	}
}

function updateCssTransform(s, v) {
	s.css('-webkit-transform', v);
	s.css('-ms-transform', v);
	s.css('-moz-transform', v);
	s.css('transform', v);
}
// Check the correctness of random password generator
QUnit.test( "Random password", function( assert ) {
  for (var i = 0; i < 1000; i++) {
    var pwd = gen_pwd(PWD_LEN);
    
    // 1. Check password length
    assert.equal(pwd.length, PWD_LEN, "[" + pwd + "] - length is not equal " + PWD_LEN);
    
    // 0. Preparation - count the number of UPPER case, lower case and numbers
    var ucnt, lcnt, scnt, ncnt;
    ucnt = lcnt = scnt = ncnt = 0;
    
    for (var j = 0; j < pwd.length; j++) {
      var chr = pwd.charCodeAt(j);
      
      // Numbers
      if (chr >= 48 && chr <= 57)
        ncnt++;
      else if (chr >= 65 && chr <= 90)
        ucnt++;
      else if (chr >= 97 && chr <= 122)
        lcnt++;
      else
        scnt++;
    }
    
    // 1. Check at least one number
    assert.ok(ncnt > 0, "[" + pwd + "] - number of numbers characters is 0");
    
    // 2. Check at least one UPPER case characters
    assert.ok(ucnt > 0, "[" + pwd + "] - number of UPPER case  is 0");
    
    // 3. Check for some lower case characters
    assert.ok(lcnt > 0, "[" + pwd + "] - number of lower case is " + lcnt);
    
    // 4. Check for one special character
    assert.ok(scnt == 1, "[" + pwd + "] - number of special characters is not 1");
  }
});
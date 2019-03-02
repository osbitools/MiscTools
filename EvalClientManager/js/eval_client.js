/*
 * Open Source Business Intelligence Tools - http://www.osbitools.com/
 * 
 * Copyright 2016 IvaLab Inc. and by respective contributors (see below).
 * 
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 * Date: 2016-03-30
 * 
 * Contributors:
 * 
 */

"use strict";

// Constants

// Account Expairation 
var EXP_DAYS = 30;

// Password length
var PWD_LEN = 6;
    
/**
 * Object that holds Evaluation Client logic
 * 
 * @author Igor Peonte
 */
function EvalClient() {
  this.is_new = true;

  // Capture date stamps
  var dts = new Date();
  var eds = new Date(dts.getFullYear(), dts.getMonth(), dts.getDate());
  eds.setDate(eds.getDate() + EXP_DAYS);
  
  this.started = dts;
  this.expired = eds.getTime();
  this.password = gen_pwd(PWD_LEN);

  /// TEST
  this.id = "me";
  this.name = "Test";
  this.email = "me@myself.com";  
}

EvalClient.prototype.password = function() {
  return this.client.pwd;
};

// Shared functions

/**
 * Generate random password with one special character
 * at least one number, at least one UPPER case, one special character
 *      and rest lower case characters
 * @param {int} len password length. Minumal length is 4 characters
 */
function gen_pwd(len) {
  var rpos = new Array(len);
  var res = new Array(len);
  for (var i = 0; i < len; i++)
    rpos[i] = i;
  
  var lmask = 'abcdefghijkmnopqrstuvwxyz';
  var umask = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  var nmask = '123456789';
  var cmask = '~!@#$%&*+=';
 
  var l2 = Math.floor(len/2) + 1;
  gen_mask_pwd(len, l2, nmask, res, rpos);
  
  // Fill one position with special character
  var idx = Math.floor(Math.random() * rpos.length);
  res[rpos[idx]] = cmask[Math.floor(Math.random() * cmask.length)];
  rpos.splice(idx, 1);
    
  gen_mask_pwd(len, l2, umask, res, rpos);
  
  for (i in rpos)
    res[rpos[i]] = lmask[Math.floor(Math.random() * lmask.length)];
    
  return res.join("");
}

function gen_mask_pwd(len, del, mask, res, rpos) {
  // Get number of numbers
  var nnum = Math.floor(Math.random() * (len - del)) + 1;
  
  // Fill positions with numbers
  for (var i = 0; i < nnum; i++) {
    // Find empty position
    var idx = Math.floor(Math.random() * rpos.length);
    res[rpos[idx]] = mask[Math.floor(Math.random() * mask.length)];
    rpos.splice(idx, 1);
  }
};

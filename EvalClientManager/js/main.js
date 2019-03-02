/*
 * Open Source Business Intelligence Tools - http://www.osbitools.com/
 * 
 * Copyright 2014-2016 IvaLab Inc. and by respective contributors (see below).
 * 
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 * Date: 2016-02-02
 * 
 * Contributors:
 * 
 */
angular.module('ClientServices', ['ngResource']).factory('clients', ['$resource',
  function($resource){
    return $resource('clients?id=:clientId', {client:'@client'}, {
      save: {method:'POST'}
    });
  }]);

// Initiate company object
angular.module('CompanyInfo',[]).factory('company', function () {
  return new Company();
});

// Initiate product object
angular.module('ProductServices',['CompanyInfo']).factory('product', function (company) {
  return new Product(company);
});

// Create main controller
angular.module('ClientManager', ['ClientServices', 'ProductServices', 'ui.bootstrap']).
                                        controller('ClientManagerController',
  function($scope, $http, $uibModal, $log, clients, product) {
    // Regex for user id
    $scope.id_regex = "[a-zA-Z0-9_]+";
    
    // Regex for email
    $scope.email_regex = "[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9]{2,}";
    
    // Save reference on product
    $scope.product = product;
    
    $http.get("./clients").then(function(res) {
      $scope.data = res.data;
      $scope.clients = res.data.clients;
    }, function(){});
    
    $scope.show_pwd = function(idx) {
      var item = $scope.clients[idx];
      if (!item.pwd) {
        item.pwd = $scope.clients[idx].password;
        item.btext = "Hide";
      } else {
        delete item.pwd;
        item.btext = "Show";
      }
    };
    
    $scope.add_client = function () {
      $scope.clients.push(new EvalClient());
    };
    
    $scope.cancel_new_client = function (idx) {
      $scope.clients.splice(idx, 1);
    };
    
    $scope.regen_pwd = function(client) {
      client.password = gen_pwd(PWD_LEN);
    };
    
    $scope.show_client_email = function (client) {
      var modalInstance = $uibModal.open({
        animation: false,
        templateUrl: 'myModalContent.html',
        controller: 'ModalInstanceCtrl',
        resolve: {
          client: client,
        }
      });
  
      modalInstance.result.then(function(client) {
        // Finally adding client
        clients.save({clientId: client.id}, client, function() {
          client.is_new = false;
          $log.info('Client ' + client.name + ' saved at: ' + new Date());
        });
        
        $log.info('Client ' + client.name + ' confirmed at: ' + new Date());
      }, function () {
        $log.info('Modal dismissed at: ' + new Date());
      });
    };
});

// Email preview controller
angular.module('ClientManager').controller('ModalInstanceCtrl', 
  function ($scope, $uibModalInstance, client, company, product) {
    $scope.client = client;
    $scope.product = product;
    $scope.company = company;
    $scope.exp_days = EXP_DAYS;
    
    $scope.ok = function () {
      $uibModalInstance.close(client);
    };
  
    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };
});

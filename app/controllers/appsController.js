'use strict';

app.controller('appsController',
  ['$scope', 'projectService', '$http', '$rootScope', '$cookies', '$intercom','$timeout',
  function ($scope,
  projectService,
  $http,
  $rootScope,
  $cookies,
  $intercom,
  $timeout) {

  $rootScope.isFullScreen=false;
  $scope.showProject=[];
  
  $scope.init=function(){
        //Hiding the Menu
        $rootScope.page='apps';
        $scope.isLoading = [];
        $rootScope.dataLoading=true;
        $rootScope.showMenu=false;
        $rootScope.currentProject=null;
        $scope.showSaveBtn = true;
        $scope.appKeysText={
          appId:"Copy",
          masterKey:"Copy",
          javascriptKey:"Copy"
        }; 

        // Intercom integration   
        integrateIntercom();
        //listing start
        var listPromise=projectService.projectList();
          listPromise
          .then(function(data){
               $rootScope.dataLoading=false; 
               $scope.projectListObj=data;                    
          },function(error){
              $rootScope.dataLoading=false; 
              $.gritter.add({
                position: 'top-right',
                title: 'Something went wrong',
                text: 'Cannot connect to server. Please try again.',
                class_name: 'danger'
              });
          });
         //listing ends

        //Start the beacon
        var x = 0;
        addCircle(x);
        setInterval(function () {
            if (x === 0) {
                x = 1;
            }
            addCircle(x);
            x++;
        }, 1200);             
  };

  $scope.deleteAppModal=function(project, index){
      $scope.projectToBeDeleted=project;
      $scope.projectToBeDeletedIndex=index;
      $scope.confirmAppName=null;
      $('#deleteappmodal').modal();
  };

  $scope.deleteProject = function(){               
      if ($scope.confirmAppName === null) { 
        $('#deleteappmodal').modal("hide"); 
        $.gritter.add({
            position: 'top-right',
            title: 'Warning',
            text: 'App name you entered was empty.',
            class_name: 'prusia'
        }); 
        $scope.confirmAppName=null;          
      } else {
        if($scope.confirmAppName === $scope.projectToBeDeleted.name){

          $scope.isLoading[$scope.projectToBeDeletedIndex] = true;

           var promise=projectService.deleteProject($scope.projectToBeDeleted.appId);
              promise.then(
                function(){
                  $scope.isLoading[$scope.projectToBeDeletedIndex] = false;
                  $scope.confirmAppName=null;
                  $('#deleteappmodal').modal("hide");  
                  //project is deleted.
                  $scope.projectListObj.splice($scope.projectListObj.indexOf($scope.projectToBeDeleted),1);
                  $.gritter.add({
                    position: 'top-right',
                    title: 'Successfull',
                    text: 'The project is successfully deleted.',
                    class_name: 'success'
                  });

                },
                function(error){
                  $scope.confirmAppName=null;
                  $('#deleteappmodal').modal("hide");  
                  $scope.isLoading[$scope.projectToBeDeletedIndex] = false;                        
                  $.gritter.add({
                    position: 'top-right',
                    title: 'oops! something went wrong',
                    text: 'Cannot delete this project at this point in time. Please try again later.',
                    class_name: 'danger'
                  });
                   
                });

        } else{  
          $scope.confirmAppName=null;
          $('#deleteappmodal').modal("hide");               
          $.gritter.add({
              position: 'top-right',
              title: 'Warning',
              text: 'App name doesnot match.',
              class_name: 'prusia'
          });         
        }                      
      }        
  };

  $scope.createProject=function(isValid){        
        $scope.appValidationError=null;
        if(isValid){
          $scope.showSaveBtn = false;               
          $scope.appValidationError=null;

          var createProjectPromise=projectService.createProject($scope.name, $scope.appId);
          createProjectPromise
          .then(function(data){
              $scope.showSaveBtn = true;
              if($scope.projectListObj.length>0){
                $scope.projectListObj.push(data);
              }else{
                $scope.projectListObj=[];
                $scope.projectListObj.push(data);
              }
              
              $.gritter.add({
                  position: 'top-right',
                  title: 'Successefull',
                  text: 'The project is successfully created.',
                  class_name: 'success'
              });

              $scope.name="";
              $scope.appId = "";

                           
            },function(error){
              $scope.showSaveBtn = true;
              if(error === 400){                   
                $.gritter.add({
                  position: 'top-right',
                    title: 'Sorry!',
                    text: 'App ID already exists. Please choose a different App ID.',
                    class_name: 'danger'
                });
              }

              if(error === 500){                     
                  $.gritter.add({
                    position: 'top-right',
                    title: 'Error',
                    text: 'Cannot connect to server. Please try again.',
                    class_name: 'danger'
                  });
              }
               
            });
        }
  }

  $scope.editProject=function(isValid,index,appId,name){

      if(isValid){

        $scope.isLoading[index] = true;

        var editProjectPromise=projectService.editProject(appId,name);
            editProjectPromise.then(
              function(data){
                 $scope.isLoading[index] = false;
                  $scope.projectListObj[index]=data;                      
                  $.gritter.add({
                    position: 'top-right',
                    title: 'Successfull',
                    text: 'The project is successfully modified.',
                    class_name: 'success'
                  });
              },
              function(error){
                  $scope.isLoading[index] = false;
                  $scope.editprojectError=error;                       
              }
            );

      }

  };

  $scope.goToTableDesigner=function(projectObj){
    //Setting Current Project
     $rootScope.currentProject=projectObj;

     /*Collapse sidebar*/           
      toggleSideBar();

     //Redirect to Table designer
     window.location.href="/#/"+projectObj.appId+"/data/designer/table/";
     
  };

  $scope.viewKeys=function(list){
    $scope.selectedProject=list;
    $('#keysModal').modal('show');
  };

  $scope.copyKeys=function(keyName){
      if(keyName=="appId"){
        $scope.appKeysText.appId="Copied!";
      }
      if(keyName=="masterKey"){
        $scope.appKeysText.masterKey="Copied!";
      }
      if(keyName=="javascriptKey"){
        $scope.appKeysText.javascriptKey="Copied!";
      }
    
     $timeout(function(){ 
        $scope.appKeysText={
          appId:"Copy",
          masterKey:"Copy",
          javascriptKey:"Copy"
        };
      }, 5000);         
      
  }; 

  $scope.toggleAppEdit=function(index){
    for(var i=0;i<$scope.showProject.length;++i){
      if(index!=i){
        $scope.showProject[i]=false;
      }
    }

    if($scope.showProject[index]==true){
      $scope.showProject[index]=false;
    }else if(!$scope.showProject[index] || $scope.showProject[index]==false){
      $scope.showProject[index]=true;
    }    
  };    

  function integrateIntercom(){
    var user = {
        name: $.cookie('userFullname'),
        email: $.cookie('email'),
        created_at: Date.parse($.cookie('createdAt')),
        user_id : $.cookie('userId')
      };

    $intercom.boot(user);

  }

  function toggleSideBar(_this){
    var b = $("#sidebar-collapse")[0];
    var w = $("#cl-wrapper");
    var s = $(".cl-sidebar");
   
    $(".fa",b).removeClass("fa-angle-left").addClass("fa-angle-right");
    w.addClass("sb-collapsed");
    $.cookie('FLATDREAM_sidebar','closed',{expires:365, path:'/'});         
    //updateHeight();
  } 

  function addCircle(id) {
      $('.first-app-beacon-container').append('<div  id="' + id + '" class="circlepulse first-app-beacon"></div>');

      $('#' + id).animate({
          'width': '50px',
          'height': '50px',
          'margin-top': '-20px',
          'margin-left': '-20px',
          'opacity': '0'
      }, 4000, 'easeOutCirc');

      setInterval(function () {
          $('#' + id).remove();
      }, 4000);
  }

  

}]);


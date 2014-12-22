<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;

class CreateTeamsTable extends Migration {

	/**
	 * Run the migrations.
	 *
	 * @return void
	 */
	public function up()
	{
		Schema::create('teams', function(Blueprint $table)
		{
			$table->increments('id');
			$table->string('name', 255)->unique();
			$table->enum('group_code', array('A', 'B', 'C', 'D', 'W'))->nullable();
			$table->timestamps();
		});
	}


	/**
	 * Reverse the migrations.
	 *
	 * @return void
	 */
	public function down()
	{
		Schema::drop('teams');
	}

}
